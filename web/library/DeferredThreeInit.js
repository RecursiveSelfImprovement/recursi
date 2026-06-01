class DeferredThreeInit {
  static resolveThree(appInstance) {
    return (
      (appInstance && appInstance.THREE) ||
      (typeof globalThis !== 'undefined' && globalThis.THREE) ||
      (typeof ThreeJSApp !== 'undefined' && ThreeJSApp.THREE) ||
      (typeof ThreeJSApp !== 'undefined' && typeof ThreeJSApp.getTHREE === 'function' ? ThreeJSApp.getTHREE() : null) ||
      null
    );
  }

  static ensureThree(appInstance, contextLabel = 'DeferredThreeInit') {
    const THREE = DeferredThreeInit.resolveThree(appInstance);
    if (!THREE) {
      throw new Error(contextLabel + ': Three.js not available');
    }
    if (appInstance && !appInstance.THREE) {
      appInstance.THREE = THREE;
    }
    return THREE;
  }

  static ensurePointer(appInstance, fieldName = 'pointer') {
    const THREE = DeferredThreeInit.ensureThree(appInstance, 'ensurePointer');
    if (!appInstance[fieldName]) {
      appInstance[fieldName] = new THREE.Vector2();
    }
    return appInstance[fieldName];
  }

  static ensureRaycaster(appInstance, fieldName = 'raycaster') {
    const THREE = DeferredThreeInit.ensureThree(appInstance, 'ensureRaycaster');
    if (!appInstance[fieldName]) {
      appInstance[fieldName] = new THREE.Raycaster();
    }
    return appInstance[fieldName];
  }

  static ensureColorArray(appInstance, hexFieldName = 'colorHexes', colorFieldName = 'colors') {
    const THREE = DeferredThreeInit.ensureThree(appInstance, 'ensureColorArray');
    if (!appInstance[colorFieldName] && Array.isArray(appInstance[hexFieldName])) {
      appInstance[colorFieldName] = appInstance[hexFieldName].map(hex => new THREE.Color(hex));
    }
    return appInstance[colorFieldName];
  }


  
}

