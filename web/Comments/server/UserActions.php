<?php
// --- USER-RELATED ACTION HANDLERS ---

function handle_register_user() {
    log_to_file("Executing: handle_register_user");
    
    if (!check_rate_limit('register', 5, 3600)) {
        send_json_error('Too many registration attempts. Please try again later.', 429);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['email']) || !isset($input['password'])) {
        send_json_error('Email and password are required.');
    }

    $email = strtolower(trim($input['email']));
    $password = trim($input['password']);
    $displayName = isset($input['displayName']) ? strip_tags(trim($input['displayName'])) : '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json_error('Invalid email address.');
    }
    if (strlen($password) < 8) {
        send_json_error('Password must be at least 8 characters.');
    }

    $text_only_name = preg_replace('/@([0-9\.]*)?/', '', $displayName);
    if (!preg_match('/^\p{L}{3,}/u', $text_only_name)) {
        send_json_error('Display name must contain at least 3 letters.');
    }

    $normalized = normalize_name($displayName);
    $session_token = bin2hex(random_bytes(32));
    $tokenHash = hash_session_token($session_token);
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($email, $displayName, $normalized, $tokenHash, $passwordHash) {
        // Check email uniqueness inside the lock
        foreach ($users as $user) {
            if (isset($user['email']) && $user['email'] === $email) {
                send_json_error('An account with this email already exists.');
            }
        }

        $suffix = 1;
        foreach ($users as $user) {
            if (isset($user['normalizedName']) && $user['normalizedName'] === $normalized) {
                $suffix++;
            }
        }
        $id = $normalized . $suffix;

        $newUser = [
            'id' => $id,
            'displayName' => $displayName,
            'normalizedName' => $normalized,
            'suffix' => $suffix,
            'email' => $email,
            'passwordHash' => $passwordHash,
            'sessionTokenHash' => $tokenHash,
            'createdAt' => date('c'),
        ];

        $users[] = $newUser;
        return ['data' => $users, 'user' => $newUser];
    });

    _set_session_cookie($session_token);

    $user_to_return = $result['user'];
    _add_public_user_data($user_to_return);
    log_to_file("User registered successfully: " . $user_to_return['id'] . " ($email)");
    echo json_encode(['success' => true, 'user' => $user_to_return]);
}

function handle_login_user() {
    log_to_file("Executing: handle_login_user");

    if (!check_rate_limit('login', 10, 900)) {
        send_json_error('Too many login attempts. Please wait 15 minutes.', 429);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['email']) || !isset($input['password'])) {
        send_json_error('Email and password are required.');
    }

    $email = strtolower(trim($input['email']));
    $password = trim($input['password']);

    if (empty($email) || empty($password)) {
        send_json_error('Email and password cannot be empty.');
    }

    $session_token = bin2hex(random_bytes(32));
    $tokenHash = hash_session_token($session_token);

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($email, $password, $tokenHash) {
        $matched_index = -1;

        foreach ($users as $index => $user) {
            if (isset($user['email']) && $user['email'] === $email) {
                $matched_index = $index;
                break;
            }
        }

        if ($matched_index === -1) {
            send_json_error('No account found with that email address.');
        }

        $matched_user = $users[$matched_index];

        if (!isset($matched_user['passwordHash']) || !password_verify($password, $matched_user['passwordHash'])) {
            // Use generic error to avoid email enumeration
            send_json_error('Invalid email or password.');
        }

        $users[$matched_index]['sessionTokenHash'] = $tokenHash;
        return ['data' => $users, 'user' => $users[$matched_index]];
    });

    _set_session_cookie($session_token);

    $user_to_return = $result['user'];
    _add_public_user_data($user_to_return);
    log_to_file("User logged in: " . $user_to_return['id']);
    echo json_encode(['success' => true, 'user' => $user_to_return]);
}

function handle_set_password() {
    log_to_file("Executing: handle_set_password");

    if (!isset($_COOKIE[COOKIE_NAME])) {
        send_json_error('Authentication required.', 401);
    }

    $token = $_COOKIE[COOKIE_NAME];
    $tokenHash = hash_session_token($token);
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['email']) || !isset($input['password'])) {
        send_json_error('Email and password are required.');
    }

    $email = strtolower(trim($input['email']));
    $password = trim($input['password']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json_error('Invalid email address.');
    }
    if (strlen($password) < 8) {
        send_json_error('Password must be at least 8 characters.');
    }

    $newPasswordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($tokenHash, $email, $newPasswordHash) {
        $current_index = -1;

        foreach ($users as $index => $user) {
            if (isset($user['sessionTokenHash']) && hash_equals($user['sessionTokenHash'], $tokenHash)) {
                $current_index = $index;
                break;
            }
        }

        if ($current_index === -1) {
            send_json_error('Invalid session.', 401);
        }

        // Check email not already used by someone else
        foreach ($users as $index => $user) {
            if ($index !== $current_index && isset($user['email']) && $user['email'] === $email) {
                send_json_error('This email is already associated with another account.');
            }
        }

        $users[$current_index]['email'] = $email;
        $users[$current_index]['passwordHash'] = $newPasswordHash;

        return ['data' => $users, 'user' => $users[$current_index]];
    });

    $user_to_return = $result['user'];
    _add_public_user_data($user_to_return);
    log_to_file("Password set for user: " . $user_to_return['id']);
    echo json_encode(['success' => true, 'user' => $user_to_return]);
}

function handle_get_or_create_user() {
    log_to_file("Executing: handle_get_or_create_user");

    if (!check_rate_limit('createuser', 20, 3600)) {
        send_json_error('Too many requests. Please try again later.', 429);
    }

    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input);
    if (!isset($input->displayName)) send_json_error('Missing displayName.');

    $displayName = strip_tags(trim($input->displayName));

    $text_only_name = preg_replace('/@([0-9\.]*)?/', '', $displayName);
    if (!preg_match('/^\\p{L}{3,}/u', $text_only_name)) {
        send_json_error('Invalid username. Name must contain at least 3 letters.');
    }

    $normalized = normalize_name($displayName);
    $session_token = bin2hex(random_bytes(32));
    $tokenHash = hash_session_token($session_token);

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($displayName, $normalized, $tokenHash) {
        // Check if exact display name already exists
        foreach ($users as $index => $user) {
            if (isset($user['displayName']) && $user['displayName'] === $displayName) {
                // Existing user — update their session token
                $users[$index]['sessionTokenHash'] = $tokenHash;
                return ['data' => $users, 'user' => $users[$index]];
            }
        }

        // New user
        $suffix = 1;
        foreach ($users as $user) {
            if (isset($user['normalizedName']) && $user['normalizedName'] === $normalized) {
                $suffix++;
            }
        }
        $id = $normalized . $suffix;

        $newUser = [
            'id' => $id,
            'displayName' => $displayName,
            'normalizedName' => $normalized,
            'suffix' => $suffix,
            'sessionTokenHash' => $tokenHash,
            'createdAt' => date('c'),
        ];

        $users[] = $newUser;
        return ['data' => $users, 'user' => $newUser];
    });

    _set_session_cookie($session_token);

    $user_to_return = $result['user'];
    _add_public_user_data($user_to_return);
    echo json_encode(['success' => true, 'user' => $user_to_return]);
}

function handle_get_current_user() {
    log_to_file("Executing: handle_get_current_user");
    if (!isset($_COOKIE[COOKIE_NAME])) {
        echo json_encode(['success' => true, 'user' => null]);
        return;
    }
    $token = $_COOKIE[COOKIE_NAME];
    $tokenHash = hash_session_token($token);

    $users = read_json_lines(USERS_FILE);
    foreach ($users as $user) {
        if (isset($user['sessionTokenHash']) && hash_equals($user['sessionTokenHash'], $tokenHash)) {
            _add_public_user_data($user);
            log_to_file("Found user session for: " . $user['id']);
            echo json_encode(['success' => true, 'user' => $user]);
            return;
        }
    }

    // Legacy fallback: check for old plaintext sessionToken field
    foreach ($users as $user) {
        if (isset($user['sessionToken']) && hash_equals($user['sessionToken'], $token)) {
            _add_public_user_data($user);
            log_to_file("Found LEGACY session for: " . $user['id'] . " (will be upgraded on next write)");
            echo json_encode(['success' => true, 'user' => $user]);
            return;
        }
    }

    log_to_file("No user session found for provided token.");
    echo json_encode(['success' => true, 'user' => null]);
}

function handle_update_user_display_name() {
    log_to_file("Executing: handle_update_user_display_name");
    if (!isset($_COOKIE[COOKIE_NAME])) send_json_error('Authentication required.', 401);

    $token = $_COOKIE[COOKIE_NAME];
    $tokenHash = hash_session_token($token);

    $input = json_decode(file_get_contents('php://input'));
    if (!isset($input->displayName)) send_json_error('Missing displayName.');

    $new_display_name = strip_tags(trim($input->displayName));
    if (empty($new_display_name)) send_json_error('Display name cannot be empty.');

    $result = atomic_read_modify_write(USERS_FILE, function($users) use ($tokenHash, $token, $new_display_name) {
        $current_index = -1;

        // Try hashed token first, then legacy plaintext
        foreach ($users as $index => $user) {
            if (isset($user['sessionTokenHash']) && hash_equals($user['sessionTokenHash'], $tokenHash)) {
                $current_index = $index;
                break;
            }
        }
        if ($current_index === -1) {
            foreach ($users as $index => $user) {
                if (isset($user['sessionToken']) && hash_equals($user['sessionToken'], $token)) {
                    $current_index = $index;
                    break;
                }
            }
        }

        if ($current_index === -1) send_json_error('Invalid session.', 401);

        $current_user = $users[$current_index];
        $new_normalized = normalize_name($new_display_name);

        if ($new_normalized !== $current_user['normalizedName']) {
            send_json_error("Cannot change the base name '{$current_user['normalizedName']}' to '{$new_normalized}'.");
        }

        $users[$current_index]['displayName'] = $new_display_name;
        return ['data' => $users, 'user' => $users[$current_index]];
    });

    $user_to_return = $result['user'];
    _add_public_user_data($user_to_return);
    echo json_encode(['success' => true, 'user' => $user_to_return]);
}

function _set_session_cookie($rawToken) {
    setcookie(COOKIE_NAME, $rawToken, [
        'expires' => time() + (86400 * 365),
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);
}

function _add_public_user_data(&$user) {
    if (!$user) return;
    unset($user['sessionToken']);
    unset($user['sessionTokenHash']);
    unset($user['passwordHash']);
    unset($user['email']);

    if (isset($user['normalizedName']) && $user['normalizedName'] === 'rob') {
        $user['avatarUrl'] = 'https://recursi.dev/userThumbnails/rob1.png';
        $user['avatarUrlL'] = 'https://recursi.dev/userThumbnails/rob1_L.png';
    }
}
