class ServerAPI {
  constructor(baseUrl = 'https://recursi.dev/commentsApi/api.php') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(baseUrl) {
    if (baseUrl && typeof baseUrl === 'string') {
      this.baseUrl = baseUrl;
    }
  }

  async _fetch(action, options = {}) {
    const defaultOptions = {
      method: 'GET',
    };
    const fetchOptions = { ...defaultOptions, ...options };
    const hasBody =
      fetchOptions.body !== undefined && fetchOptions.body !== null;

    let url = `${this.baseUrl}?action=${action}`;

    if (!fetchOptions.headers) {
      fetchOptions.headers = {};
    } else {
      fetchOptions.headers = { ...fetchOptions.headers };
    }

    fetchOptions.credentials = 'include';

    if (hasBody) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    } else {
      delete fetchOptions.headers['Content-Type'];
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}_cacheBust=${Date.now()}`;
    }

    console.log(`[ServerAPI] Sending request to action '${action}'`, {
      url,
      options: fetchOptions,
    });

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        let errorMsg = `Server error: ${response.status} ${response.statusText}`;
        const rawText = await response.text();
        console.error(
          `[ServerAPI] Non-OK response for action '${action}'`,
          rawText
        );
        try {
          const errorJson = JSON.parse(rawText);
          if (errorJson && errorJson.error) {
            errorMsg = errorJson.error;
          }
        } catch (e) {}
        return { success: false, error: errorMsg };
      }

      const jsonData = await response.json();
      console.log(
        `[ServerAPI] Received successful JSON response for action '${action}'`,
        jsonData
      );
      return jsonData;
    } catch (error) {
      console.error(`[ServerAPI] Fetch error for action '${action}':`, error);
      return { success: false, error: `Network error: ${error.message}` };
    }
  }

  async getThreadData(threadId = 'main') {
    return this._fetch(
      `getThreadData&threadId=${encodeURIComponent(threadId)}`
    );
  }

  async getOrCreateUser(displayName) {
    return this._fetch('getOrCreateUser', {
      method: 'POST',
      body: { displayName },
    });
  }

  async postComment({ parentId, userId, text, threadId = 'main' }) {
    return this._fetch('postComment', {
      method: 'POST',
      body: { parentId, userId, text, threadId },
    });
  }

  async getCurrentUser() {
    return this._fetch('getCurrentUser');
  }

  async updateUserDisplayName(displayName) {
    return this._fetch('updateUserDisplayName', {
      method: 'POST',
      body: { displayName },
    });
  }

  async clearAllData(threadId = null) {
    const body = {};
    if (threadId) body.threadId = threadId;
    return this._fetch('clearAllData', { method: 'POST', body });
  }

  async deleteComment(commentId, userId, threadId = 'main') {
    return this._fetch('deleteComment', {
      method: 'POST',
      body: {
        targetId: commentId,
        userId,
        threadId,
      },
    });
  }

  async registerUser(email, password, displayName) {
    return this._fetch('registerUser', {
      method: 'POST',
      body: { email, password, displayName },
    });
  }

  async loginUser(email, password) {
    return this._fetch('loginUser', {
      method: 'POST',
      body: { email, password },
    });
  }

  async submitRating(payload) {
    return this._fetch('submitRating', {
      method: 'POST',
      body: payload,
    });
  }

  async setPassword(email, password) {
    return this._fetch('setPassword', {
      method: 'POST',
      body: { email, password },
    });
  }

  async adminGetThreadStats(threadId = 'main') {
    return this._fetch(
      `adminGetThreadStats&threadId=${encodeURIComponent(threadId)}`
    );
  }

  async adminDeleteComment(
    commentId,
    threadId = 'main',
    deletedBy = 'admin-debug'
  ) {
    return this._fetch('adminDeleteComment', {
      method: 'POST',
      body: {
        targetId: commentId,
        threadId,
        deletedBy,
      },
    });
  }

  async adminAssumeUserSession(userId) {
    return this._fetch('adminAssumeUserSession', {
      method: 'POST',
      body: { userId },
    });
  }

  async adminGetThreads() {
    return this._fetch('adminGetThreads');
  }

  async adminLogout() {
    return this._fetch('adminLogout', { method: 'POST' });
  }

}

