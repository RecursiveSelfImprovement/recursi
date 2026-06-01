<?php
// --- COMMENT-RELATED ACTION HANDLERS ---

function handle_delete_comment() {
    log_to_file("Executing: handle_delete_comment");
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['targetId']) || !isset($input['userId'])) {
        send_json_error('Missing targetId or userId.');
    }

    $threadId = $input['threadId'] ?? 'main';
    $commentsFilePath = get_comments_file_path($threadId);

    $tombstone = [
        'type' => 'delete',
        'targetId' => $input['targetId'],
        'deletedBy' => $input['userId'],
        'timestamp' => date('c')
    ];

    _append_to_file($commentsFilePath, $tombstone);
    echo json_encode(['success' => true]);
}

function handle_get_thread_data() {
    log_to_file("Executing: handle_get_thread_data");
    
    $threadId = $_GET['threadId'] ?? 'main';
    $commentsFilePath = get_comments_file_path($threadId);
    
    $users = read_json_lines(USERS_FILE);
    $raw_lines = read_json_lines($commentsFilePath);
    
    $comments_map = [];
    $deletions_map = [];
    $tree = [];

    foreach ($raw_lines as $item) {
        if (!is_array($item)) continue;
        
        if (isset($item['type']) && $item['type'] === 'delete') {
            if (isset($item['targetId'])) {
                $deletions_map[$item['targetId']] = true;
            }
        } elseif (isset($item['id'])) {
            $obj = (object)$item;
            $obj->children = [];
            $obj->isDeleted = false;
            $comments_map[$obj->id] = $obj;
        }
    }

    foreach ($deletions_map as $delId => $val) {
        if (isset($comments_map[$delId])) {
            $comments_map[$delId]->isDeleted = true;
            $comments_map[$delId]->text = "[message deleted]";
        }
    }

    foreach ($comments_map as $id => $commentObj) {
        $parentId = isset($commentObj->parentId) ? $commentObj->parentId : null;
        
        if ($parentId && isset($comments_map[$parentId])) {
            $comments_map[$parentId]->children[] = $commentObj;
        } else {
            $tree[] = $commentObj;
        }
    }

    function prune_tree(&$nodes) {
        $nodes = array_filter($nodes, function($node) {
            if (!empty($node->children)) {
                prune_tree($node->children);
            }
            if ($node->isDeleted && empty($node->children)) {
                return false;
            }
            return true;
        });
        $nodes = array_values($nodes);
    }

    prune_tree($tree);

    $public_users = array_map(function($user) {
        if (is_array($user)) {
            unset($user['sessionToken']);
            unset($user['sessionTokenHash']);
            unset($user['passwordHash']);
            unset($user['email']);
        }
        return $user;
    }, $users);

    echo json_encode(['success' => true, 'users' => $public_users, 'comments' => $tree]);
}

function handle_post_comment() {
    log_to_file("Executing: handle_post_comment");
    
    if (!check_rate_limit('postcomment', 30, 60)) {
        send_json_error('You are posting too quickly. Please slow down.', 429);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['userId']) || !isset($input['text'])) send_json_error('Missing userId or text.');

    $text = sanitize_comment_text($input['text']);
    if (empty($text)) send_json_error('Comment text cannot be empty.');
    
    $threadId = isset($input['threadId']) ? $input['threadId'] : 'main';
    $commentsFilePath = get_comments_file_path($threadId);
    
    $newComment = [
        'id' => 'comment-' . time() . '-' . bin2hex(random_bytes(6)),
        'userId' => $input['userId'],
        'text' => $text,
        'timestamp' => date('c'),
        'parentId' => isset($input['parentId']) ? $input['parentId'] : null
    ];

    _append_to_file($commentsFilePath, $newComment);

    $newComment['children'] = [];
    echo json_encode(['success' => true, 'comment' => $newComment]);
}

function handle_admin_seed_comment() {
    log_to_file("Executing: handle_admin_seed_comment");
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['userId']) || !isset($input['text']) || !isset($input['timestamp'])) {
         send_json_error('Missing userId, text, or timestamp for seeding.');
    }
    
    $text = sanitize_comment_text($input['text']);
    if (empty($text)) {
        send_json_error('Comment text cannot be empty for seeding.');
    }
    
    $threadId = $input['threadId'] ?? 'main';
    $commentsFilePath = get_comments_file_path($threadId);

    $id = isset($input['id']) ? $input['id'] : 'comment-' . time() . '-' . bin2hex(random_bytes(6));

    $newComment = [
        'id' => $id,
        'userId' => $input['userId'],
        'text' => $text,
        'timestamp' => $input['timestamp'],
        'parentId' => $input['parentId'] ?? null
    ];

    _append_to_file($commentsFilePath, $newComment);
    echo json_encode(['success' => true, 'id' => $newComment['id']]);
}

function handle_submit_rating() {
    log_to_file("Executing: handle_submit_rating");
    
    if (!check_rate_limit('rating', 20, 300)) {
        send_json_error('Too many ratings submitted. Please wait a few minutes.', 429);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['commentId']) || !isset($input['userId'])) {
        send_json_error('Missing commentId or userId.');
    }

    $ratingsFile = DATA_PATH . 'ratings.txt';
    
    $feedback = isset($input['feedback']) ? sanitize_comment_text($input['feedback']) : '';
    
    $record = [
        'id' => 'rating-' . time() . '-' . bin2hex(random_bytes(6)),
        'commentId' => $input['commentId'],
        'userId' => $input['userId'],
        'sliders' => $input['sliders'] ?? [],
        'feedback' => $feedback,
        'timestamp' => date('c'),
        'status' => 'pending_moderation'
    ];

    _append_to_file($ratingsFile, $record);
    echo json_encode(['success' => true]);
}

/**
 * Safely append a single JSON record to a file with exclusive locking.
 */
function _append_to_file($filePath, $record) {
    $fp = fopen($filePath, 'a');
    if (!$fp || !flock($fp, LOCK_EX)) {
        send_json_error('Could not acquire lock on file.', 500);
    }
    fwrite($fp, json_encode($record) . PHP_EOL);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}
