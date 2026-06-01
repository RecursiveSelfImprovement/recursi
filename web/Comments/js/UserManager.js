class UserManager {
  constructor() {
    this.reset();
  }

  /**
   * Loads a fresh set of users from the server, replacing any existing data.
   * @param {Array<Object>} usersArray - The array of user objects from the API.
   */

  _normalizeName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  _validateName(name) {
    // Letters only, at least 3 characters.
    return /^[a-zA-Z]{3,}$/.test(name);
  }

  getOrCreateUser(displayName) {
    if (!displayName || !this._validateName(displayName)) {
      console.error('Invalid username:', displayName);
      return null;
    }

    const normalized = this._normalizeName(displayName);
    const existingUsers = this.usersByNormalizedName.get(normalized) || [];

    // Check if a user with this exact display name already exists
    const existingUser = existingUsers.find(
      (u) => u.displayName === displayName
    );
    if (existingUser) {
      return existingUser;
    }

    // Create a new user
    const suffix = existingUsers.length + 1;
    const id = `${normalized}${suffix}`;

    const newUser = {
      id: id,
      displayName: displayName, // Preserve original casing
      normalizedName: normalized,
      suffix: suffix,
    };

    existingUsers.push(newUser);
    this.usersByNormalizedName.set(normalized, existingUsers);
    this.usersById.set(id, newUser);

    return newUser;
  }

  getUserById(id) {
    return this.usersById.get(id);
  }

  getAllUsers() {
    return Array.from(this.usersById.values());
  }

  isDuplicate(normalizedName) {
    const users = this.usersByNormalizedName.get(normalizedName);
    return users && users.length > 1;
  }

  reset() {
    // Stored by normalized name: { rob: [{...}, {...}], alice: [{...}] }
    this.usersByNormalizedName = new Map();
    // Stored by unique ID: { rob1: {...}, alice1: {...} }
    this.usersById = new Map();
  }

  loadUsers(usersArray) {
    this.reset();
    if (!usersArray) return;

    usersArray.forEach((user) => {
      this.addUser(user);
    });
  }

  /**
   * Adds or updates a single user in the cache.
   * @param {Object} user - The user object to add or update.
   */

  addUser(user) {
    if (!user || !user.id) return;

    // Remove old entry if it exists to handle updates
    const oldUser = this.usersById.get(user.id);
    if (oldUser) {
      const oldUserGroup = this.usersByNormalizedName.get(
        oldUser.normalizedName
      );
      if (oldUserGroup) {
        const index = oldUserGroup.findIndex((u) => u.id === oldUser.id);
        if (index > -1) {
          oldUserGroup.splice(index, 1);
        }
      }
    }

    this.usersById.set(user.id, user);

    const normalized = user.normalizedName;
    const userGroup = this.usersByNormalizedName.get(normalized) || [];
    // Ensure no duplicates in the group
    if (!userGroup.some((u) => u.id === user.id)) {
      userGroup.push(user);
    }
    this.usersByNormalizedName.set(normalized, userGroup);
  }

}

