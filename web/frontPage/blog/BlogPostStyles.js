
class BlogPostStyles {
  static init() {
    applyCss(this.css());
  }

  static css() {
    return [
      this.cssReset(),
      this.cssBody(),
      this.cssArticle(),
      this.cssTypography(),
      this.cssSidebar(),
      this.cssFooter(),
    ].join('\n');
  }

  static cssReset() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
    `;
  }

  static cssBody() {
    return `
      body {
        background: #0e0e14;
        color: #d4d0cb;
        font-family: 'Quicksand', sans-serif;
        font-weight: 400;
        line-height: 1.8;
        min-height: 100vh;
      }
    `;
  }

  static cssArticle() {
    return `
      .blog-article {
        max-width: 680px;
        margin: 0 auto;
        padding: 3rem 1.5rem 4rem;
      }
    `;
  }

  static cssTypography() {
    return `
      .blog-title {
        font-size: 1.8rem;
        font-weight: 600;
        color: #fff;
        margin-bottom: 0.4rem;
        line-height: 1.3;
      }
      .blog-subtitle {
        font-size: 1.05rem;
        font-weight: 300;
        color: #8a8690;
        margin-bottom: 0.6rem;
        font-style: italic;
      }
      .blog-byline {
        font-family: 'Fira Code', monospace;
        font-size: 0.75rem;
        color: #5a5660;
        margin-bottom: 2.5rem;
      }
      .blog-body p {
        font-size: 1.0rem;
        margin-bottom: 1.3rem;
        color: #d4d0cb;
      }
      .blog-body strong {
        color: #fff;
        font-weight: 600;
      }
      .blog-body em {
        color: #ff8c40;
        font-style: italic;
      }
      .blog-body a {
        color: #00c8ff;
        text-decoration: none;
        border-bottom: 1px solid rgba(0, 200, 255, 0.25);
        transition: border-color 0.2s;
      }
      .blog-body a:hover {
        border-color: #00c8ff;
      }
      .blog-section-break {
        text-align: center;
        color: #3a3640;
        margin: 2rem 0;
        font-size: 0.9rem;
        letter-spacing: 0.5em;
      }
      .blog-body h2 {
        font-size: 1.15rem;
        font-weight: 600;
        color: #fff;
        margin-top: 2rem;
        margin-bottom: 0.8rem;
      }
    `;
  }

  static cssFooter() {
    return `
      .blog-footer {
        margin-top: 3rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255,255,255,0.06);
        font-family: 'Fira Code', monospace;
        font-size: 0.75rem;
        color: #5a5660;
      }
      .blog-footer a {
        color: #00c8ff;
        text-decoration: none;
      }
    `;
  }

  static cssSidebar() {
    return `
    .blog-para-wrap {
      position: relative;
    }
    .blog-sidebar {
      margin: 0.5rem 0 1.5rem;
      padding: 0.9rem 1.1rem;
      background: rgba(255, 140, 64, 0.05);
      border-left: 2px solid rgba(255, 140, 64, 0.4);
      border-radius: 0 6px 6px 0;
      font-size: 0.88rem;
    }
    .blog-sidebar-title {
      font-family: 'Fira Code', monospace;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #ff8c40;
      margin-bottom: 0.4rem;
      font-weight: 500;
    }
    .blog-sidebar-body {
      color: #b8b4ae;
      line-height: 1.6;
    }
    .blog-sidebar-body em {
      color: #ff8c40;
      font-style: italic;
    }
    @media (min-width: 900px) {
      .blog-sidebar {
        float: right;
        width: 260px;
        margin: 0.3rem -290px 1rem 1.5rem;
      }
    }
  `;
  }

}

