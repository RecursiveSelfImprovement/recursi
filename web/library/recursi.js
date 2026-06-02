globalThis.__classRegistrationLogger={logs:[],log(c,t){this.logs.push({c,t,at:new Date().toLocaleTimeString()})},clear(){this.logs=[]},getFormattedText(){return this.logs.length?this.logs.map(l=>`[${l.at}] Class "${l.c}" -> ${l.t}`).join('\n'):'No classes registered globally yet.';}};
// recursi.js
(function() {
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.dataset || !currentScript.dataset.files) {
    return;
  }

  const filesUrl = currentScript.dataset.files;
  const scriptSrc = currentScript.src || '';
  const lastSlash = scriptSrc.lastIndexOf('/');
  const basePath = lastSlash !== -1 ? scriptSrc.substring(0, lastSlash + 1) : '';

  const actualLoaderUrl = basePath + 'RecursiLoader.js';

  const script = document.createElement('script');
  
  // CACHE BUSTER: If dev mode is requested, ensure we fetch the newest RecursiLoader
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.port === '8000' ||
                window.location.search.includes('dev=true') || 
                window.location.search.includes('useDB=true');
  script.src = actualLoaderUrl + (isDev ? '?_=' + Date.now() : '');
  
  script.onload = () => {
    if (typeof RecursiLoader !== 'undefined' && typeof RecursiLoader.run === 'function') {
      RecursiLoader.run(null, basePath, filesUrl);
    } else {
      console.error(`[recursi] RecursiLoader failed to load or has no run method.`);
    }
  };
  script.onerror = () => {
    console.error(`[recursi] Failed to load the loader script at ${actualLoaderUrl}`);
  };

  document.head.appendChild(script);
})();