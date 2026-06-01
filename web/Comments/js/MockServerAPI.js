class MockServerAPI {
  constructor() {
    this.db = { users: [], threads: { main: [] } }; // Changed comments to threads map
    this.currentUser = null;

    this.serverUserManager = {
      usersByNormalizedName: new Map(),
      usersById: new Map(),
      _normalizeName: (name) =>
        (name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      getOrCreateUser: (displayName) => {
        if (!displayName || !displayName.trim()) {
          throw new Error('Invalid username. Name cannot be empty.');
        }
        const normalized = this.serverUserManager._normalizeName(displayName);
        const existingUsers =
          this.serverUserManager.usersByNormalizedName.get(normalized) || [];

        const existingUser = existingUsers.find(
          (u) => u.displayName === displayName
        );

        if (existingUser) {
          if (normalized === 'rob' && !existingUser.avatarUrl) {
            existingUser.avatarUrl =
              'https://recursi.dev/userThumbnails/rob1.png';
            existingUser.avatarUrlL =
              'https://recursi.dev/userThumbnails/rob1_L.png';
          }
          return existingUser;
        }

        const suffix = existingUsers.length + 1;
        const id = `${normalized}${suffix}`;
        const newUser = {
          id,
          displayName,
          normalizedName: normalized,
          suffix,
        };

        if (normalized === 'rob') {
          newUser.avatarUrl = 'https://recursi.dev/userThumbnails/rob1.png';
          newUser.avatarUrlL = 'https://recursi.dev/userThumbnails/rob1_L.png';
        }

        existingUsers.push(newUser);
        this.serverUserManager.usersByNormalizedName.set(
          normalized,
          existingUsers
        );
        this.serverUserManager.usersById.set(id, newUser);
        this.db.users.push(newUser);
        return newUser;
      },
      reset: () => {
        this.serverUserManager.usersByNormalizedName.clear();
        this.serverUserManager.usersById.clear();
      },
    };

    this.initialized = this._seedInitialData();
  }

  _simulateNetworkDelay(resolveValue, delay = 300) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(resolveValue), Math.random() * delay + 50);
    });
  }

  async _seedInitialData() {
    this.db = { users: [], threads: { main: [] } };
    this.serverUserManager.reset();
    this.currentUser = null;

    try {
      const response = await fetch('/Comments/sampleComments.txt');
      if (!response.ok) {
        throw new Error(
          `Failed to fetch sample comments: ${response.statusText}`
        );
      }
      const text = await response.text();
      const parsedPosts = await this._parseSampleComments(text);

      const userNames = [...new Set(parsedPosts.map((p) => p.user))];
      userNames.forEach((name) => this.serverUserManager.getOrCreateUser(name));

      const commentsMap = new Map();
      const rawComments = parsedPosts.map((post) => {
        const user = this.db.users.find((u) => u.displayName === post.user);
        const comment = {
          id: post.id,
          userId: user ? user.id : 'unknown',
          text: post.text,
          timestamp: post.timestamp,
          parentId: post.parentId,
          children: [],
        };
        commentsMap.set(comment.id, comment);
        return comment;
      });

      const rootComments = [];
      rawComments.forEach((comment) => {
        if (comment.parentId) {
          const parent = commentsMap.get(comment.parentId);
          if (parent) {
            parent.children.push(comment);
          } else {
            rootComments.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      commentsMap.forEach((c) => delete c.parentId);

      this.db.threads['main'] = rootComments;
      this.db.users = Array.from(this.serverUserManager.usersById.values());

      console.log(
        `[MockServerAPI] Seeded ${this.db.users.length} users and ${this.db.threads['main'].length} root comments into 'main' thread.`
      );
    } catch (error) {
      console.error(
        'Error seeding initial data from sampleComments.txt:',
        error
      );
      this.db.threads['main'] = [];
    }
  }

  async getThreadData(threadId = 'main') {
    await this.initialized;

    // Auto-initialize thread if it doesn't exist in mock
    if (!this.db.threads[threadId]) {
      this.db.threads[threadId] = [];
    }

    const data = {
      success: true,
      users: JSON.parse(JSON.stringify(this.db.users)),
      comments: JSON.parse(JSON.stringify(this.db.threads[threadId])),
    };
    return this._simulateNetworkDelay(data);
  }

  async getOrCreateUser(displayName) {
    await this.initialized;
    try {
      const user = this.serverUserManager.getOrCreateUser(displayName);
      this.currentUser = user; // Set the 'session' user
      return this._simulateNetworkDelay({
        success: true,
        user: JSON.parse(JSON.stringify(user)),
      });
    } catch (error) {
      return this._simulateNetworkDelay({
        success: false,
        error: error.message,
      });
    }
  }

  async postComment({ parentId, userId, text, threadId = 'main' }) {
    await this.initialized;
    if (!userId || !text) {
      return this._simulateNetworkDelay({
        success: false,
        error: 'User and text are required.',
      });
    }

    if (!this.db.threads[threadId]) {
      this.db.threads[threadId] = [];
    }

    const newComment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      userId: userId,
      text: text,
      timestamp: new Date().toISOString(),
      children: [],
    };

    if (parentId) {
      const findParent = (nodes) => {
        for (const node of nodes) {
          if (node.id === parentId) return node;
          const found = findParent(node.children || []);
          if (found) return found;
        }
        return null;
      };
      // Search in the specific thread
      const parent = findParent(this.db.threads[threadId]);
      if (parent) {
        parent.children.push(newComment);
      } else {
        return this._simulateNetworkDelay({
          success: false,
          error: 'Parent comment not found.',
        });
      }
    } else {
      this.db.threads[threadId].push(newComment);
    }
    return this._simulateNetworkDelay({
      success: true,
      comment: JSON.parse(JSON.stringify(newComment)),
    });
  }

  async rebuildAndSeed() {
    this.initialized = this._seedInitialData();
    await this.initialized;
    return this._simulateNetworkDelay({ success: true });
  }

  async getCurrentUser() {
    await this.initialized;
    // Simulate checking for a session cookie and returning the user if found.
    return this._simulateNetworkDelay({
      success: true,
      user: this.currentUser,
    });
  }

  async updateUserDisplayName(displayName) {
    await this.initialized;
    if (!this.currentUser) {
      return this._simulateNetworkDelay({
        success: false,
        error: 'Not logged in.',
      });
    }

    // This logic mirrors what the server should do
    const newNormalized = displayName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (newNormalized !== this.currentUser.normalizedName) {
      return this._simulateNetworkDelay({
        success: false,
        error: `Cannot change base name from "${this.currentUser.normalizedName}" to "${newNormalized}".`,
      });
    }

    // Find the user in the "database" and update them
    const userInDb = this.db.users.find((u) => u.id === this.currentUser.id);
    if (userInDb) {
      userInDb.displayName = displayName;
    }

    // Update the "session" user
    this.currentUser.displayName = displayName;

    return this._simulateNetworkDelay({
      success: true,
      user: JSON.parse(JSON.stringify(this.currentUser)),
    });
  }

  async _parseSampleComments(text) {
    const posts = [];
    // Split by the separator and filter out empty strings that result from splits at the start/end of the file.
    const blocks = text
      .split(
        '======================================================================'
      )
      .filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const post = {};
      const contentLines = [];
      let inContent = false;

      for (const line of lines) {
        if (
          line.startsWith(
            '----------------------------------------------------------------------'
          )
        ) {
          inContent = true;
          continue;
        }

        if (inContent) {
          contentLines.push(line);
        } else {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (key === 'POST ID') post.id = value;
          else if (key === 'USER') post.user = value;
          else if (key === 'DATE')
            post.timestamp = new Date(value).toISOString();
          else if (key === 'REPLY TO')
            post.parentId = value === 'none' ? null : value;
        }
      }
      post.text = contentLines.join('\n').trim();
      posts.push(post);
    }
    return posts;
  }

  async adminSeedComment(data) {
    console.warn(
      '[MockServerAPI] adminSeedComment called on Mock API. This should only happen on Live.'
    );
    return this.postComment(data);
  }

  async registerUser(email, password, displayName) {
    await this.initialized;
    return this.getOrCreateUser(displayName); // Simulate registration with existing mock logic
  }

  async loginUser(email, password) {
    await this.initialized;
    if (this.db.users.length > 0) {
      this.currentUser = this.db.users[0]; // Simulate login as first available mock user
      return this._simulateNetworkDelay({
        success: true,
        user: this.currentUser,
      });
    }
    return this._simulateNetworkDelay({
      success: false,
      error: 'No users found in mock database.',
    });
  }

  async submitRating(payload) {
    return this._simulateNetworkDelay({ success: true }); // Fake success for mock mode
  }

  async setPassword(email, password) {
    await this.initialized;
    if (!this.currentUser) {
      return this._simulateNetworkDelay({
        success: false,
        error: 'Not logged in.',
      });
    }
    // In mock mode, just store email on the current user
    this.currentUser.email = email;
    return this._simulateNetworkDelay({
      success: true,
      user: JSON.parse(JSON.stringify(this.currentUser)),
    });
  }

}

