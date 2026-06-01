// recursi.js
(function() {
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.dataset || (!currentScript.dataset.files && !currentScript.dataset.dependencies && !currentScript.dataset.main)) {
    return;
  }

  const filesUrl = currentScript.dataset.files;
  const depsUrl = currentScript.dataset.dependencies;
  const mainUrl = currentScript.dataset.main || null;
  
  const isVibes = !!depsUrl;
  const loaderClassName = isVibes ? 'VibesLoader' : 'RecursiLoader';
  const loaderFileName = loaderClassName + '.js';

  const scriptSrc = currentScript.src || '';
  const lastSlash = scriptSrc.lastIndexOf('/');
  const basePath = lastSlash !== -1 ? scriptSrc.substring(0, lastSlash + 1) : '';

  const actualLoaderUrl = basePath + loaderFileName;

  const script = document.createElement('script');
  
  // CACHE BUSTER: If dev mode is requested, ensure we fetch the newest RecursiLoader
  const isDev = window.location.search.includes('dev=true') || window.location.search.includes('useDB=true');
  script.src = actualLoaderUrl + (isDev ? '?_=' + Date.now() : '');
  
  script.onload = () => {
    const LoaderClass = globalThis[loaderClassName];
    if (LoaderClass && typeof LoaderClass.run === 'function') {
      if (isVibes) {
        LoaderClass.run(mainUrl, depsUrl, basePath);
      } else {
        LoaderClass.run(mainUrl, basePath, filesUrl);
      }
    } else {
      console.error(`[recursi] ${loaderClassName} failed to load or has no run method.`);
    }
  };
  script.onerror = () => {
    console.error(`[recursi] Failed to load the loader script at ${actualLoaderUrl}`);
  };

  document.head.appendChild(script);
})();