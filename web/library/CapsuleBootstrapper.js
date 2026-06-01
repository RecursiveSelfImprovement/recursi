class CapsuleBootstrapper {
  

  static async boot(AppCapsuleClass, parentElement = document.body, runtime = null) {
    console.log(`[CapsuleBootstrapper] Booting ${AppCapsuleClass.name}...`);
    try {
      const app = new AppCapsuleClass(runtime);
      if (typeof app.init === 'function') {
        await app.init(parentElement);
      }
      console.log(`[CapsuleBootstrapper] Successfully booted ${AppCapsuleClass.name}.`);
      return app;
    } catch (e) {
      console.error(`[CapsuleBootstrapper] Failed to boot ${AppCapsuleClass.name}:`, e);
      throw e;
    }
  }
}