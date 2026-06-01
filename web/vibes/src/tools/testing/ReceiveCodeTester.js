class ReceiveCodeTester {

      constructor(env, options = {}) {
        this.env = env || {};
        this.app = options.app || this.env.app || this.env.appRef || window._dev_projectEditorInstance || globalThis._dev_projectEditorInstance || null;
        this.results = [];
        this.createdPaths = [];
        this.testPrefix = 'RCT3';
        this.root = null;
        this.output = null;
        this.status = null;
        this.dialog = null;
        this.externalHandle = null;
      }

      open() {
        this._installStyles();

        this.root = this._el('div', { className: 'rct-root' });

        const header = this._el('div', { className: 'rct-header' }, [
          this._el('div', { className: 'rct-title' }, 'Receive Code Tester V3'),
          this._el(
            'div',
            { className: 'rct-subtitle' },
            'Permanent proof harness for global class injection, visibility sets, project writes, hotpatch/undo, pending transactions, and external-folder writes.'
          ),
        ]);

        const controls = this._el('div', { className: 'rct-controls' }, [
          this._button('Run All Safe Tests', () => this.runAllSafeTests()),
          this._button('Global Class Test', () => this.testGlobalClassPublication()),
          this._button('Visibility Smoke Set Test', () => this.testVisibilitySmokeSetExactReset()),
          this._button('Project Write/Read Test', () => this.testProjectWriteRead()),
          this._button('Runtime Hotpatch + Undo Test', () => this.testRuntimeHotpatchUndo()),
          this._button('Pending Transaction Simulation', () => this.testPendingTransactionSimulation()),
          this._button('External Folder Write Test', () => this.testExternalFolderWritePrompt()),
          this._button('Cleanup Project Test Files', () => this.cleanupProjectFiles()),
          this._button('Copy Report', () => this.copyReport()),
          this._button('Clear Output', () => this.clearOutput()),
        ]);

        this.status = this._el('div', { className: 'rct-status' }, 'Ready.');

        this.output = this._el('textarea', {
          className: 'rct-output',
          readOnly: true,
          spellcheck: false,
          value: '',
        });

        const notes = this._el('div', { className: 'rct-notes' }, [
          this._el('b', {}, 'Current foundations expected: '),
          this._el('span', {}, 'GLOBALSPACE2 and VISRESET1. Classes should be global, and visibility sets should exact-reset/filter.'),
        ]);

        this.root.append(header, controls, this.status, this.output, notes);

        if (typeof UITools !== 'undefined') {
          this.dialog = UITools.makeDialog({
            title: 'Receive Code Tester V3',
            content: this.root,
            width: '88vw',
            height: 'auto',
            allowMaximize: true,
            allowTransparency: true,
            buttons: [],
            stateId: 'ReceiveCodeTesterV3',
          });
        } else {
          const shell = this._el('div', { className: 'rct-floating-shell' }, [this.root]);
          document.body.append(shell);
        }

        this.log('opened tester');
        this.logEnvironmentSummary();
        return this;
      }

      async runAllSafeTests() {
    return await this._rct4RunLocked('Run All Safe Tests', async () => {
      this.beginSection('RUN ALL SAFE TESTS');
      await this.testEnvironment();
      await this.testGlobalClassPublication();
      await this.ensureSimpleVisibilitySmokeSet();
      await this.testVisibilitySmokeSetExactReset();
      await this.testVisibilityControlLocations();
      await this.testRuntimeHotpatchUndo();
      await this.testPendingTransactionSimulation();
      await this.testProjectWriteRead();
      this.endSection('RUN ALL SAFE TESTS COMPLETE');
    });
  }

      async testEnvironment() {
        this.beginSection('ENVIRONMENT');

        const rows = [
          ['env exists', !!this.env],
          ['env.appRef', this.env.appRef ? this.env.appRef.constructor?.name || 'present' : false],
          ['env.app', this.env.app ? this.env.app.constructor?.name || 'present' : false],
          ['window._dev_projectEditorInstance', window._dev_projectEditorInstance ? window._dev_projectEditorInstance.constructor?.name || 'present' : false],
          ['this.app', this.app ? this.app.constructor?.name || 'present' : false],
          ['projectFilesManager', !!this.projectFilesManager()],
          ['fileTreeView nodesMap size', this.projectFilesManager()?.fileTreeView?.nodesMap?.size ?? '(none)'],
          ['env.readFile', typeof this.env.readFile],
          ['env.writeFile', typeof this.env.writeFile],
          ['UITools', typeof globalThis.UITools],
          ['showDirectoryPicker', typeof globalThis.showDirectoryPicker],
          ['ReceiveCodeTester global', typeof globalThis.ReceiveCodeTester],
          ['__vibesGlobalScriptClasses', globalThis.__vibesGlobalScriptClasses instanceof Set ? `Set(${globalThis.__vibesGlobalScriptClasses.size})` : false],
        ];

        for (const [name, value] of rows) {
          this.pass(`${name}: ${String(value)}`);
        }

        this.endSection('ENVIRONMENT');
      }

      async testGlobalClassPublication() {
        this.beginSection('GLOBAL CLASS PUBLICATION');

        const classOk = typeof globalThis.ReceiveCodeTester === 'function';
        const windowOk = typeof window.ReceiveCodeTester === 'function';
        const registryOk = !!globalThis.__vibesGlobalScriptClasses?.has?.('ReceiveCodeTester');

        if (classOk) this.pass('globalThis.ReceiveCodeTester is function');
        else this.fail('globalThis.ReceiveCodeTester is not function');

        if (windowOk) this.pass('window.ReceiveCodeTester is function');
        else this.fail('window.ReceiveCodeTester is not function');

        if (registryOk) this.pass('__vibesGlobalScriptClasses contains ReceiveCodeTester');
        else this.fail('__vibesGlobalScriptClasses does not contain ReceiveCodeTester');

        this.result({
          test: 'global-class-publication',
          ok: classOk && windowOk,
          globalThisType: typeof globalThis.ReceiveCodeTester,
          windowType: typeof window.ReceiveCodeTester,
          registryOk,
          layer: 'UnifiedProtocolExecutor global script space',
          disk: false,
        });

        this.endSection('GLOBAL CLASS PUBLICATION');
      }

      async ensureSimpleVisibilitySmokeSet() {
        this.beginSection('ENSURE SIMPLE VISIBILITY SMOKE SET');

        const name = 'RCT Simple Visibility Smoke Set';
        const wanted = [
          '/library/DialogBox.js',
          '/vibes/src/editor/ui/fileTree/FileTreeView.js',
          '/vibes/src/editor/ui/fileTree/ProjectFilesManager.js',
          '/vibes/src/editor/ui/dialogs/PasteReviewDialog.js',
          '/vibes/src/editor/ui/promptBuilder/BuildPromptTab.js',
        ];

        const found = [];
        const missing = [];

        for (const path of wanted) {
          try {
            const text = await this.env.readFile(path);
            if (typeof text === 'string') {
              found.push(path);
              this.pass(`verified smoke path: ${path} (${text.length} bytes)`);
            } else {
              missing.push(path);
              this.fail(`unreadable smoke path: ${path}`);
            }
          } catch (error) {
            missing.push(path);
            this.fail(`missing smoke path: ${path}: ${error.message}`);
          }
        }

        const set = {
          name,
          description: 'Tiny verified smoke-test visibility set created by ReceiveCodeTester V3.',
          createdAt: new Date().toISOString(),
          source: 'ReceiveCodeTester.ensureSimpleVisibilitySmokeSet',
          requestedCount: wanted.length,
          foundCount: found.length,
          missingCount: missing.length,
          missingPaths: missing,
          items: found.map(path => ({
            path,
            visible: true,
            code: true,
            signatures: true,
            docs: false,
            docsLevel: 'none',
            kind: 'code',
          })),
        };

        this.saveStoredVisibilitySet(set);

        if (missing.length === 0) {
          this.pass(`stored smoke visibility set: ${name} (${found.length}/${wanted.length})`);
        } else {
          this.fail(`stored smoke visibility set with missing paths: ${missing.length}`);
        }

        this.result({
          test: 'ensure-simple-visibility-smoke-set',
          ok: missing.length === 0,
          name,
          foundCount: found.length,
          missingCount: missing.length,
          layer: 'localStorage visibility-set store',
          disk: false,
        });

        this.endSection('ENSURE SIMPLE VISIBILITY SMOKE SET');
        return set;
      }

      async testVisibilitySmokeSetExactReset() {
      this.beginSection('VISIBILITY SMOKE SET EXACT RESET/FILTER');

      const name = 'RCT Simple Visibility Smoke Set';
      let set = this.loadStoredVisibilitySet(name);

      if (!set) {
        this.log('smoke set missing; creating it now');
        set = await this.ensureSimpleVisibilitySmokeSet();
      }

      if (!set || !Array.isArray(set.items) || !set.items.length) {
        this.fail('smoke set unavailable or empty');
        this.endSection('VISIBILITY SMOKE SET EXACT RESET/FILTER');
        return;
      }

      const pfm = this.projectFilesManager();

      this.log(`projectFilesManager found: ${!!pfm}`);
      
      const trees = typeof pfm?.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      const nodeCount = trees.reduce((sum, t) => sum + (t.nodesMap?.size || 0), 0);
      this.log(`active tree views: ${trees.length} · total node elements: ${nodeCount}`);
      this.log(`applyStoredVisibilitySet type: ${typeof pfm?.applyStoredVisibilitySet}`);

      if (!pfm?.applyStoredVisibilitySet) {
        this.fail('ProjectFilesManager.applyStoredVisibilitySet unavailable');
        this.result({
          test: 'visibility-smoke-set-exact-reset',
          ok: false,
          reason: 'applyStoredVisibilitySet unavailable',
        });
        this.endSection('VISIBILITY SMOKE SET EXACT RESET/FILTER');
        return;
      }

      const result = pfm.applyStoredVisibilitySet(name, {
        applyWidgets: true,
        filter: true,
        resetFirst: true,
      });

      this.log(`apply result: ${JSON.stringify(result)}`);

      const selected = this.collectSelectedVisibilityPaths(pfm);
      const librarySelected = selected.filter(path => path.startsWith('/library/'));
      const expected = new Set(set.items.map(item => item.path));

      let missingExpected = 0;
      for (const path of expected) {
        if (!selected.includes(path)) {
          missingExpected++;
          this.fail(`missing expected selected path: ${path}`);
        }
      }

      for (const path of selected.slice(0, 40)) {
        this.log(`selected: ${path}`);
      }

      const ok =
        !!result?.ok &&
        result.matched === set.items.length &&
        result.missingCount === 0 &&
        missingExpected === 0 &&
        selected.length === set.items.length &&
        librarySelected.length === 1;

      if (ok) {
        this.pass(`visibility exact reset/filter passed: selected=${selected.length}, librarySelected=${librarySelected.length}`);
      } else {
        this.fail(`visibility exact reset/filter failed: selected=${selected.length}, librarySelected=${librarySelected.length}, missingExpected=${missingExpected}`);
      }

      this.result({
        test: 'visibility-smoke-set-exact-reset',
        ok,
        applyResult: result,
        selectedCount: selected.length,
        librarySelectedCount: librarySelected.length,
        missingExpected,
        layer: 'ProjectFilesManager + FileTreeView visibility widgets',
        disk: false,
      });

      this.endSection('VISIBILITY SMOKE SET EXACT RESET/FILTER');
    }

      async testProjectWriteRead() {
    return await this._rct4RunLocked('Project Write/Read Test', async () => {
      this.beginSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');

      if (typeof this.env.writeFile !== 'function' || typeof this.env.readFile !== 'function') {
        this.fail('project write/read unavailable: env.writeFile or env.readFile missing');
        this.endSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');
        return;
      }

      const stamp = this._stamp();
      const path = `/vibes/demos/_receive_code_tester_${stamp}.txt`;

      const first = [
        'ReceiveCodeTester V5 project write/read timeout-safe test',
        `stamp=${stamp}`,
        'phase=first',
        `createdAt=${new Date().toISOString()}`,
        '',
      ].join('\n');

      const second = [
        'ReceiveCodeTester V5 project write/read timeout-safe test',
        `stamp=${stamp}`,
        'phase=second-overwrite',
        `updatedAt=${new Date().toISOString()}`,
        '',
      ].join('\n');

      this.createdPaths.push(path);
      this.log(`target project/server file: ${path}`);

      const write1 = await this._rct5WithTimeout(
        `env.writeFile first ${path}`,
        () => this.env.writeFile(path, first),
        6000
      );

      this._rct5LogIoResult(write1);

      if (!write1.ok) {
        this.fail(`first write failed/timed out; aborting readback for ${path}`);
        this.result({
          test: 'project-write-read-overwrite-timeout-safe',
          ok: false,
          path,
          failedAt: 'write1',
          write1,
          layer: 'project/server env.writeFile + env.readFile',
          disk: true,
        });
        this.endSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');
        return;
      }

      await this._sleep(250);

      const read1 = await this._rct5WithTimeout(
        `env.readFile first ${path}`,
        () => this.env.readFile(path),
        6000
      );

      this._rct5LogIoResult(read1);

      if (!read1.ok) {
        this.fail(`first read failed/timed out for ${path}`);
        this.result({
          test: 'project-write-read-overwrite-timeout-safe',
          ok: false,
          path,
          failedAt: 'read1',
          write1,
          read1,
          layer: 'project/server env.writeFile + env.readFile',
          disk: true,
        });
        this.endSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');
        return;
      }

      if (read1.value === first) {
        this.pass(`project readback exact after first write: ${path}`);
      } else {
        this.fail(`project readback mismatch after first write: ${path}`);
        this.diffLengths(first, read1.value);
      }

      const write2 = await this._rct5WithTimeout(
        `env.writeFile overwrite ${path}`,
        () => this.env.writeFile(path, second),
        6000
      );

      this._rct5LogIoResult(write2);

      if (!write2.ok) {
        this.fail(`overwrite failed/timed out; aborting final readback for ${path}`);
        this.result({
          test: 'project-write-read-overwrite-timeout-safe',
          ok: false,
          path,
          failedAt: 'write2',
          write1,
          read1,
          write2,
          layer: 'project/server env.writeFile + env.readFile',
          disk: true,
        });
        this.endSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');
        return;
      }

      await this._sleep(250);

      const read2 = await this._rct5WithTimeout(
        `env.readFile overwrite ${path}`,
        () => this.env.readFile(path),
        6000
      );

      this._rct5LogIoResult(read2);

      const exactFinal = read2.ok && read2.value === second;

      if (exactFinal) {
        this.pass(`project readback exact after overwrite: ${path}`);
      } else if (!read2.ok) {
        this.fail(`final read failed/timed out for ${path}`);
      } else {
        this.fail(`project readback mismatch after overwrite: ${path}`);
        this.diffLengths(second, read2.value);
      }

      this.result({
        test: 'project-write-read-overwrite-timeout-safe',
        ok: exactFinal,
        path,
        write1,
        read1: { ...read1, value: read1.ok ? `[${String(read1.value).length} chars]` : undefined },
        write2,
        read2: { ...read2, value: read2.ok ? `[${String(read2.value).length} chars]` : undefined },
        layer: 'project/server env.writeFile + env.readFile',
        disk: true,
      });

      this.endSection('PROJECT WRITE / READ / OVERWRITE TIMEOUT-SAFE');
    });
  }

      async cleanupProjectFiles() {
    return await this._rct4RunLocked('Cleanup Project Test Files', async () => {
      this.beginSection('CLEANUP PROJECT FILES TIMEOUT-SAFE');

      const paths = Array.from(new Set(this.createdPaths || []));

      if (!paths.length) {
        this.log('no generated project paths recorded in this tester instance');
        this.endSection('CLEANUP PROJECT FILES TIMEOUT-SAFE');
        return;
      }

      for (const path of paths) {
        const deleteResult = await this._rct5WithTimeout(
          `delete generated project file ${path}`,
          () => this._tryDeleteProjectPath(path),
          5000
        );

        this._rct5LogIoResult(deleteResult);

        if (deleteResult.ok && deleteResult.value === true) {
          this.pass(`deleted generated project file: ${path}`);
          continue;
        }

        const tombstone = [
          'ReceiveCodeTester V5 cleanup tombstone',
          'Delete API was unavailable, failed, or timed out, so this file was overwritten as cleaned.',
          `cleanedAt=${new Date().toISOString()}`,
          '',
        ].join('\n');

        const tombstoneResult = await this._rct5WithTimeout(
          `cleanup tombstone write ${path}`,
          () => this.env.writeFile(path, tombstone),
          6000
        );

        this._rct5LogIoResult(tombstoneResult);

        if (tombstoneResult.ok) {
          this.pass(`cleanup tombstone written: ${path}`);
        } else {
          this.fail(`cleanup tombstone failed/timed out: ${path}`);
        }
      }

      this.endSection('CLEANUP PROJECT FILES TIMEOUT-SAFE');
    });
  }

      async testRuntimeHotpatchUndo() {
        this.beginSection('RUNTIME HOTPATCH + UNDO');

        const proto = ReceiveCodeTester.prototype;
        const methodName = '_rctHotpatchProbe';
        const before = Object.getOwnPropertyDescriptor(proto, methodName);
        const token = `hotpatched-${this._stamp()}`;

        try {
          Object.defineProperty(proto, methodName, {
            configurable: true,
            writable: true,
            value() {
              return token;
            },
          });

          const value = this._rctHotpatchProbe();

          if (value === token) this.pass(`runtime hotpatch applied: ReceiveCodeTester.${methodName}() -> ${value}`);
          else this.fail(`runtime hotpatch returned wrong value: ${value}`);

          if (before) Object.defineProperty(proto, methodName, before);
          else delete proto[methodName];

          const undone = typeof this[methodName] !== 'function' || this[methodName]() !== token;

          if (undone) this.pass(`runtime hotpatch undone/restored: ReceiveCodeTester.${methodName}`);
          else this.fail(`runtime hotpatch undo failed: ${methodName}`);

          this.result({
            test: 'runtime-hotpatch-undo',
            ok: value === token && undone,
            className: 'ReceiveCodeTester',
            methodName,
            layer: 'live JavaScript prototype only',
            disk: false,
          });
        } catch (error) {
          this.fail(`runtime hotpatch error: ${error.message}`);

          try {
            if (before) Object.defineProperty(proto, methodName, before);
            else delete proto[methodName];
          } catch (e) {}

          this.result({ test: 'runtime-hotpatch-undo', ok: false, error: error.message });
        }

        this.endSection('RUNTIME HOTPATCH + UNDO');
      }

      async testPendingTransactionSimulation() {
        this.beginSection('PENDING TRANSACTION SIMULATION');

        const registry = this.patchTransactionRegistry();
        const id = `rct3-pending-${this._stamp()}`;
        const file = `/vibes/demos/_receive_code_tester_pending_${this._stamp()}.js`;

        const transaction = {
          id,
          mode: 'memory-simulation',
          createdAt: new Date().toISOString(),
          files: [file],
          plans: [{ action: 'write', path: file, content: 'class ReceiveCodeTesterPendingExampleV3 {}\\n' }],
          saved: false,
        };

        registry.transactions.set(id, transaction);
        registry.files.set(file, { transactionId: id, state: 'memory', at: transaction.createdAt });

        const hasTransaction = registry.transactions.has(id);
        const hasFile = registry.files.has(file);

        if (hasTransaction && hasFile) {
          this.pass(`pending transaction registered in memory: ${id}`);
          this.pass(`pending file state registered: ${file}`);
        } else {
          this.fail('pending transaction registration failed');
        }

        this.markTree(file, 'dirty', { label: 'test', detail: `ReceiveCodeTester V3 pending simulation ${id}` });

        registry.transactions.delete(id);
        registry.files.delete(file);

        if (!registry.transactions.has(id) && !registry.files.has(file)) this.pass(`pending transaction cleanup succeeded: ${id}`);
        else this.fail(`pending transaction cleanup failed: ${id}`);

        this.result({
          test: 'pending-transaction-simulation',
          ok: hasTransaction && hasFile,
          id,
          file,
          layer: 'in-memory transaction registry only',
          disk: false,
        });

        this.endSection('PENDING TRANSACTION SIMULATION');
      }

      async testExternalFolderWritePrompt() {
    return await this._rct4RunLocked('External Folder Write Test', async () => {
      this.beginSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');

      if (typeof showDirectoryPicker !== 'function') {
        this.fail('showDirectoryPicker unavailable in this browser/context');
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      this.log('EXTFS1 opening folder picker...');
      this.status.textContent = 'Choose a folder for external write/read/delete test.';

      const picker = await this._extfs1Step(
        'showDirectoryPicker',
        () => showDirectoryPicker({ mode: 'readwrite' }),
        { timeoutMs: 30000 }
      );

      if (!picker.ok) {
        this.fail('external folder picker failed/timed out/canceled');
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: 'showDirectoryPicker',
          picker,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const dirHandle = picker.value;
      this.externalHandle = dirHandle;

      this.log(`EXTFS1 selected folder: ${dirHandle.name}`);

      const permission = await this._extfs1Step(
        'ensure readwrite permission',
        () => this._ensureExternalWritePermission(dirHandle),
        { timeoutMs: 10000 }
      );

      if (!permission.ok || permission.value !== 'granted') {
        this.fail(`external folder permission not granted: ${permission.value || permission.error || 'unknown'}`);
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: 'permission',
          folderName: dirHandle.name,
          permission,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const stamp = this._stamp();
      const fileName = `receive_code_tester_external_${stamp}.txt`;

      const first = [
        'ReceiveCodeTester EXTFS1 external folder test',
        `folderName=${dirHandle.name}`,
        `file=${fileName}`,
        'phase=first',
        `createdAt=${new Date().toISOString()}`,
        '',
      ].join('\n');

      const second = [
        'ReceiveCodeTester EXTFS1 external folder test',
        `folderName=${dirHandle.name}`,
        `file=${fileName}`,
        'phase=second-overwrite',
        `updatedAt=${new Date().toISOString()}`,
        '',
      ].join('\n');

      const fileHandleResult = await this._extfs1Step(
        `getFileHandle create ${fileName}`,
        () => dirHandle.getFileHandle(fileName, { create: true }),
        { timeoutMs: 10000 }
      );

      if (!fileHandleResult.ok) {
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: 'getFileHandle',
          folderName: dirHandle.name,
          fileName,
          fileHandleResult,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const fileHandle = fileHandleResult.value;

      const writeFirst = await this._extfs1WriteFileHandleStep(fileHandle, first, 'first write');
      if (!writeFirst.ok) {
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: writeFirst.failedAt || 'first write',
          folderName: dirHandle.name,
          fileName,
          writeFirst,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const readFirst = await this._extfs1ReadFileHandleStep(fileHandle, 'first read');
      if (!readFirst.ok) {
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: readFirst.failedAt || 'first read',
          folderName: dirHandle.name,
          fileName,
          readFirst,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      if (readFirst.text === first) {
        this.pass(`external readback exact after first write: ${dirHandle.name}/${fileName}`);
      } else {
        this.fail(`external readback mismatch after first write: ${dirHandle.name}/${fileName}`);
        this.diffLengths(first, readFirst.text);
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: 'first read exact comparison',
          folderName: dirHandle.name,
          fileName,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const writeSecond = await this._extfs1WriteFileHandleStep(fileHandle, second, 'overwrite write');
      if (!writeSecond.ok) {
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: writeSecond.failedAt || 'overwrite write',
          folderName: dirHandle.name,
          fileName,
          writeSecond,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const readSecond = await this._extfs1ReadFileHandleStep(fileHandle, 'overwrite read');
      if (!readSecond.ok) {
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: readSecond.failedAt || 'overwrite read',
          folderName: dirHandle.name,
          fileName,
          readSecond,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      if (readSecond.text === second) {
        this.pass(`external readback exact after overwrite: ${dirHandle.name}/${fileName}`);
      } else {
        this.fail(`external readback mismatch after overwrite: ${dirHandle.name}/${fileName}`);
        this.diffLengths(second, readSecond.text);
        this.result({
          test: 'external-folder-timeout-safe',
          ok: false,
          failedAt: 'overwrite read exact comparison',
          folderName: dirHandle.name,
          fileName,
        });
        this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
        return;
      }

      const remove = await this._extfs1Step(
        `removeEntry cleanup ${fileName}`,
        () => dirHandle.removeEntry(fileName),
        { timeoutMs: 10000 }
      );

      if (remove.ok) {
        this.pass(`external cleanup delete succeeded: ${dirHandle.name}/${fileName}`);
      } else {
        this.fail(`external cleanup delete failed/timed out: ${dirHandle.name}/${fileName}`);
      }

      this.result({
        test: 'external-folder-timeout-safe',
        ok: remove.ok,
        folderName: dirHandle.name,
        fileName,
        layer: 'client File System Access API',
        disk: true,
        external: true,
        cleanupDeleted: remove.ok,
      });

      this.endSection('EXTERNAL FOLDER WRITE TEST TIMEOUT-SAFE');
    });
  }

      projectFilesManager() {
        return (
          this.app?.projectFilesManager ||
          window._dev_projectEditorInstance?.projectFilesManager ||
          globalThis._dev_projectEditorInstance?.projectFilesManager ||
          this.env.app?.projectFilesManager ||
          this.env.appRef?.projectFilesManager ||
          null
        );
      }

      collectSelectedVisibilityPaths(pfm = this.projectFilesManager()) {
      const selected = [];
      if (!pfm) return selected;

      const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
      const seen = new Set();

      for (const tree of trees) {
        if (tree.nodesMap) {
          for (const node of tree.nodesMap.values()) {
            if (!node || node.type === 'directory') continue;
            if (seen.has(node.id)) continue;

            const state =
              node.visibilityState ||
              node.visibilityWidget?.state ||
              node.getVisibilityState?.() ||
              null;

            const isSelected =
              !!state?.code ||
              !!state?.signatures ||
              !!state?.docs ||
              state?.docsLevel === 'full' ||
              state?.docsLevel === 'summary' ||
              state?.docsLevel === 'signatures';

            if (isSelected) {
              seen.add(node.id);
              selected.push(node.id);
            }
          }
        }
      }
      return selected.sort();
    }

      saveStoredVisibilitySet(set) {
        const slug = this.slug(set.name);
        const payload = JSON.stringify(set, null, 2);

        const keys = [
          `vibes.visibilitySet.rct3.${slug}`,
          `vibes.visibilitySet.rsv1.${slug}`,
          `vibes.visibilitySet.vsol1.${slug}`,
          `vibes.visibilitySet.${slug}`,
          `visibilitySet:${set.name}`,
          `visibility-set:${set.name}`,
        ];

        for (const key of keys) {
          localStorage.setItem(key, payload);
        }

        globalThis.__vibesStoredVisibilitySets ||= {};
        globalThis.__vibesStoredVisibilitySets[set.name] = set;

        return set;
      }

      loadStoredVisibilitySet(name) {
        const slug = this.slug(name);
        const keys = [
          `vibes.visibilitySet.rct3.${slug}`,
          `vibes.visibilitySet.rsv1.${slug}`,
          `vibes.visibilitySet.vsol1.${slug}`,
          `vibes.visibilitySet.${slug}`,
          `visibilitySet:${name}`,
          `visibility-set:${name}`,
        ];

        for (const key of keys) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);
            if (parsed?.name === name && Array.isArray(parsed.items)) return parsed;
          } catch (error) {}
        }

        return null;
      }

      patchTransactionRegistry() {
        if (!globalThis.__vibesPatchTransactionRegistry) {
          globalThis.__vibesPatchTransactionRegistry = { transactions: new Map(), files: new Map() };
        }

        return globalThis.__vibesPatchTransactionRegistry;
      }

      async _tryDeleteProjectPath(path) {
    const attempts = [
      ['env.deleteFile', async () => await this.env.deleteFile(path)],
      ['env.removeFile', async () => await this.env.removeFile(path)],
      ['env.unlink', async () => await this.env.unlink(path)],
      ['app.fileStore.delete', async () => await this.app.fileStore.delete(path)],
      ['app.fileStore.deleteFile', async () => await this.app.fileStore.deleteFile(path)],
      [
        'app.projectFilesManager.fileStore.delete',
        async () => await this.app.projectFilesManager.fileStore.delete(path),
      ],
      [
        'app.projectFilesManager.fileStore.deleteFile',
        async () => await this.app.projectFilesManager.fileStore.deleteFile(path),
      ],
      [
        'app.projectFilesManager.store.delete',
        async () => await this.app.projectFilesManager.store.delete(path),
      ],
      [
        'app.projectFilesManager.store.deleteFile',
        async () => await this.app.projectFilesManager.store.deleteFile(path),
      ],
    ];

    for (const [label, attempt] of attempts) {
      try {
        const rootName = label.split('.')[0];
        if (rootName === 'env' && !this.env) continue;
        if (rootName === 'app' && !this.app) continue;

        await attempt();
        this.log(`delete succeeded via ${label}: ${path}`);
        return true;
      } catch (error) {
        if (!/undefined|null|not a function/i.test(String(error.message))) {
          this.log(`delete attempt failed via ${label}: ${error.message}`);
        }
      }
    }

    return false;
  }

      async _ensureExternalWritePermission(dirHandle) {
        if (!dirHandle?.queryPermission || !dirHandle?.requestPermission) return 'unknown';

        let permission = await dirHandle.queryPermission({ mode: 'readwrite' });

        if (permission !== 'granted') {
          permission = await dirHandle.requestPermission({ mode: 'readwrite' });
        }

        return permission;
      }

      async _writeFileHandle(fileHandle, text) {
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
      }

      async _readFileHandle(fileHandle) {
        const file = await fileHandle.getFile();
        return await file.text();
      }

      logEnvironmentSummary() {
        this.beginSection('INITIAL ENVIRONMENT SUMMARY');
        this.log(`app: ${this.app ? this.app.constructor?.name || 'present' : 'missing'}`);
        this.log(`env.appRef: ${this.env.appRef ? this.env.appRef.constructor?.name || 'present' : 'missing'}`);
        this.log(`window._dev_projectEditorInstance: ${window._dev_projectEditorInstance ? window._dev_projectEditorInstance.constructor?.name || 'present' : 'missing'}`);
        this.log(`projectFilesManager: ${this.projectFilesManager() ? 'present' : 'missing'}`);
        this.log(`env.readFile: ${typeof this.env.readFile}`);
        this.log(`env.writeFile: ${typeof this.env.writeFile}`);
        this.log(`DialogBox: ${typeof globalThis.UITools}`);
        this.log(`showDirectoryPicker: ${typeof globalThis.showDirectoryPicker}`);
        this.endSection('INITIAL ENVIRONMENT SUMMARY');
      }

      result(data) {
        this.results.push({ at: new Date().toISOString(), ...data });
      }

      beginSection(title) {
        this.log('');
        this.log(`=== ${title} ===`);
        if (this.status) this.status.textContent = title;
      }

      endSection(title) {
        this.log(`=== END ${title} ===`);
        if (this.status) this.status.textContent = title;
      }

      pass(message) {
        this.log(`✅ ${message}`);
      }

      fail(message) {
        this.log(`❌ ${message}`);
      }

      log(message) {
        const line = `${this.testPrefix} ${message}`;

        if (this.output) {
          this.output.value += line + '\n';
          this.output.scrollTop = this.output.scrollHeight;
        }

        try {
          console.log(line);
        } catch (e) {}
      }

      diffLengths(expected, actual) {
        this.log(`expected length: ${String(expected || '').length}`);
        this.log(`actual length: ${String(actual || '').length}`);
      }

      async copyReport() {
        const report = this.output?.value || '';
        await navigator.clipboard?.writeText?.(report);
        if (this.status) this.status.textContent = `Copied ${report.length} chars.`;
        this.log(`copied report chars=${report.length}`);
      }

      clearOutput() {
        if (this.output) this.output.value = '';
        this.results = [];
        if (this.status) this.status.textContent = 'Cleared.';
      }

      markTree(path, state, options = {}) {
        const registry =
          globalThis.FileTreeActivityRegistry?.shared?.() ||
          globalThis.__fileTreeActivityRegistry ||
          null;

        if (registry?.mark) {
          try {
            registry.mark(path, state, {
              label: options.label || state,
              detail: options.detail || '',
              duration: options.duration ?? 1200,
            });
            return true;
          } catch (error) {
            this.log(`tree activity mark failed: ${error.message}`);
          }
        }

        return false;
      }

      slug(name) {
        return String(name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      _stamp() {
        return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 17);
      }

      _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      _button(text, onclick) {
    return this._el('button', {
      type: 'button',
      textContent: text,
      onclick: () => this._rct4RunLocked(text, onclick),
    });
  }

      _el(tag, props = {}, children = []) {
        const el = document.createElement(tag);

        for (const [key, value] of Object.entries(props || {})) {
          if (key === 'style' && value && typeof value === 'object') Object.assign(el.style, value);
          else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
          else if (key === 'className') el.className = value;
          else if (key === 'textContent') el.textContent = value;
          else if (key === 'innerHTML') el.innerHTML = value;
          else if (key in el) el[key] = value;
          else el.setAttribute(key, value);
        }

        const childList = Array.isArray(children) ? children : [children];

        for (const child of childList) {
          if (child == null) continue;
          if (child instanceof Node) el.appendChild(child);
          else el.appendChild(document.createTextNode(String(child)));
        }

        return el;
      }

      _installStyles() {
    if (document.getElementById('receive-code-tester-v3-styles')) return;

    const style = document.createElement('style');
    style.id = 'receive-code-tester-v3-styles';
    style.textContent = `
      .rct-root {
        color: var(--text-color, white);
        font-family: system-ui, sans-serif;
        max-height: 78vh;
        overflow: auto;
      }

      .rct-header {
        border-bottom: 1px solid rgba(180,210,240,.25);
        padding-bottom: 8px;
        margin-bottom: 8px;
      }

      .rct-title {
        font-size: 18px;
        font-weight: 850;
      }

      .rct-subtitle {
        margin-top: 3px;
        font-size: 12px;
        opacity: .78;
        line-height: 1.35;
      }

      .rct-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin: 8px 0;
      }

      .rct-controls button {
        border-radius: 7px;
        border: 1px solid rgba(180,220,255,.28);
        background: rgba(255,255,255,.08);
        color: var(--text-color, white);
        padding: 6px 9px;
        cursor: pointer;
        font-size: 12px;
      }

      .rct-controls button:hover:not(:disabled) {
        background: rgba(255,255,255,.16);
      }

      .rct-controls button:disabled {
        opacity: .35;
        cursor: not-allowed;
      }

      .rct-is-busy .rct-output {
        outline: 2px solid rgba(255, 210, 90, .85);
        box-shadow: 0 0 16px rgba(255, 210, 90, .35);
      }

      .rct-busy-banner {
        margin: 8px 0;
        padding: 9px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 210, 90, .7);
        background: rgba(255, 210, 90, .14);
        font-size: 13px;
        font-weight: 800;
      }

      .rct-status {
        margin: 8px 0;
        padding: 7px;
        border-radius: 7px;
        background: rgba(120,160,220,.12);
        border: 1px solid rgba(120,160,220,.25);
        font-size: 12px;
      }

      .rct-status-busy {
        background: rgba(255, 210, 90, .14);
        border-color: rgba(255, 210, 90, .65);
        font-weight: 800;
      }

      .rct-status-done {
        background: rgba(80, 220, 140, .13);
        border-color: rgba(80, 220, 140, .55);
      }

      .rct-status-failed {
        background: rgba(255, 90, 90, .13);
        border-color: rgba(255, 90, 90, .55);
      }

      .rct-output {
        width: 100%;
        min-height: 380px;
        box-sizing: border-box;
        resize: vertical;
        border-radius: 8px;
        border: 1px solid rgba(180,220,255,.25);
        background: rgba(0,0,0,.28);
        color: #eaf6ff;
        padding: 9px;
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .rct-notes {
        margin-top: 8px;
        font-size: 12px;
        opacity: .78;
      }

      .rct-floating-shell {
        position: fixed;
        inset: 30px;
        z-index: 2147483647;
        border-radius: 12px;
        border: 1px solid rgba(180,220,255,.35);
        background: rgba(20,24,32,.97);
        padding: 12px;
        overflow: auto;
      }
    `;

    document.head.append(style);
  }

  _rct4DescribeElement(el) {
    if (!el) return '(none)';

    const parts = [el.tagName.toLowerCase()];

    if (el.id) parts.push(`#${el.id}`);

    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5)
        .map(name => `.${name}`)
        .join('');

      if (classes) parts.push(classes);
    }

    const text = String(el.textContent || el.value || el.title || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);

    return `${parts.join('')} "${text}"`;
  }

  _rct4FindSourceFilesRoot() {
    const candidates = Array.from(document.querySelectorAll('section, details, div, article'));

    for (const el of candidates) {
      const text = String(el.textContent || '').toLowerCase();
      if (text.includes('source files') && text.includes('visibility')) return el;
    }

    return null;
  }

  _rct4FindBuildPromptRoot() {
    const candidates = Array.from(document.querySelectorAll('section, details, div, article'));

    for (const el of candidates) {
      const text = String(el.textContent || '').toLowerCase();
      if (text.includes('build prompt') && text.includes('source files')) return el;
    }

    return null;
  }

  _rct4FindElementsContainingText(text) {
    const needle = String(text || '').toLowerCase();
    if (!needle) return [];

    const out = [];
    const all = Array.from(document.querySelectorAll('body *'));

    for (const el of all) {
      const ownText = Array.from(el.childNodes || [])
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent || '')
        .join(' ')
        .trim()
        .toLowerCase();

      const valueText = String(el.value || '').toLowerCase();
      const titleText = String(el.title || '').toLowerCase();

      if (ownText.includes(needle) || valueText.includes(needle) || titleText.includes(needle)) {
        out.push(el);
      }
    }

    return out;
  }

  async testVisibilityControlLocations() {
    this.beginSection('VISIBILITY CONTROL LOCATIONS');

    const labels = [
      'Stored Set Tree Sync',
      'Stored Visibility Sets',
      'Visibility Set Filter',
      'TreeWalker Focused Recon',
      'ChatGPT TreeWalker Focused Recon',
      'Gemini TreeWalker Full Recon',
      'RCT Simple Visibility Smoke Set',
      'Source Files',
    ];

    for (const label of labels) {
      const matches = this._rct4FindElementsContainingText(label);
      this.log(`control text "${label}": ${matches.length}`);

      for (const match of matches.slice(0, 4)) {
        this.log(`  ${label} near: ${this._rct4DescribeElement(match)}`);
      }
    }

    const buildPromptRoot = this._rct4FindBuildPromptRoot();
    this.log(`Build Prompt-ish root found: ${!!buildPromptRoot}`);
    if (buildPromptRoot) {
      this.log(`Build Prompt-ish root: ${this._rct4DescribeElement(buildPromptRoot)}`);
    }

    const sourceFilesRoot = this._rct4FindSourceFilesRoot();
    this.log(`Source Files-ish root found: ${!!sourceFilesRoot}`);
    if (sourceFilesRoot) {
      this.log(`Source Files-ish root: ${this._rct4DescribeElement(sourceFilesRoot)}`);
    }

    const hasTreeSync = this._rct4FindElementsContainingText('Stored Set Tree Sync').length > 0;
    const hasSmokeSet = this._rct4FindElementsContainingText('RCT Simple Visibility Smoke Set').length > 0;
    const hasFocusedRecon =
      this._rct4FindElementsContainingText('TreeWalker Focused Recon').length > 0 ||
      this._rct4FindElementsContainingText('ChatGPT TreeWalker Focused Recon').length > 0;

    if (hasTreeSync) {
      this.pass('Stored Set Tree Sync UI is present');
    } else {
      this.fail('Stored Set Tree Sync UI not found');
    }

    if (hasSmokeSet) {
      this.pass('RCT Simple Visibility Smoke Set appears in UI');
    } else {
      this.fail('RCT Simple Visibility Smoke Set not visible in UI');
    }

    if (hasFocusedRecon) {
      this.pass('TreeWalker Focused Recon visibility set appears in UI');
    } else {
      this.log('TreeWalker Focused Recon visibility set not visible; may not be loaded/stored in this session');
    }

    this.log('');
    this.log('Interpretation:');
    this.log('- Build Prompt → Source Files is the real visibility-set home.');
    this.log('- Stored Set Tree Sync is the bridge that filters/applies the tree from a chosen stored set.');
    this.log('- TreeWalker Focused Recon is a visibility set/handoff context, not the TreeWalker runner.');
    this.log('- If this feels too noisy, next cleanup should rename/hide/collapse Stored Set Tree Sync.');

    this.result({
      test: 'visibility-control-locations',
      ok: hasTreeSync && hasSmokeSet,
      hasTreeSync,
      hasSmokeSet,
      hasFocusedRecon,
      layer: 'DOM/UI inspection',
      disk: false,
    });

    this.endSection('VISIBILITY CONTROL LOCATIONS');
  }

  async _rct4RunLocked(label, fn) {
    if (this._rct4Busy) {
      this.log(`⏳ STILL RUNNING: ignored extra click for ${label}`);
      return {
        ok: false,
        reason: 'busy',
        label,
      };
    }

    this._rct4Busy = true;
    this._rctBusyLabel = label;
    this._rctSetBusyUI(true, label);

    this.log('');
    this.log(`⏳ RUNNING: ${label}`);

    if (this.status) {
      this.status.textContent = `⏳ RUNNING: ${label}`;
      this.status.classList.add('rct-status-busy');
      this.status.classList.remove('rct-status-done', 'rct-status-failed');
    }

    try {
      const result = await fn();

      this.log(`✅ DONE: ${label}`);

      if (this.status) {
        this.status.textContent = `✅ DONE: ${label}`;
        this.status.classList.remove('rct-status-busy', 'rct-status-failed');
        this.status.classList.add('rct-status-done');
      }

      return result;
    } catch (error) {
      this.log(`❌ FAILED: ${label}: ${error.message}`);
      console.error(error);

      if (this.status) {
        this.status.textContent = `❌ FAILED: ${label}`;
        this.status.classList.remove('rct-status-busy', 'rct-status-done');
        this.status.classList.add('rct-status-failed');
      }

      return {
        ok: false,
        error: error.message,
        label,
      };
    } finally {
      this._rct4Busy = false;
      this._rctBusyLabel = '';
      this._rctSetBusyUI(false, label);
    }
  }

  _rctSetBusyUI(isBusy, label = '') {
    if (!this.root) return;

    this.root.classList.toggle('rct-is-busy', !!isBusy);

    const buttons = Array.from(this.root.querySelectorAll('button'));

    for (const button of buttons) {
      const text = String(button.textContent || '');

      const allowedWhileBusy =
        text.includes('Copy Report') ||
        text.includes('Clear Output');

      button.disabled = !!isBusy && !allowedWhileBusy;
    }

    let banner = this.root.querySelector('.rct-busy-banner');

    if (isBusy) {
      if (!banner) {
        banner = this._el('div', { className: 'rct-busy-banner' });
        const anchor = this.status || this.output || this.root.firstChild;
        if (anchor?.parentElement) {
          anchor.parentElement.insertBefore(banner, anchor);
        } else {
          this.root.prepend(banner);
        }
      }

      banner.textContent = `⏳ BUSY - ${label} is running. Buttons are disabled until it finishes.`;
    } else if (banner) {
      banner.textContent = `✅ Finished: ${label}`;
      setTimeout(() => {
        if (banner?.isConnected) banner.remove();
      }, 1800);
    }
  }

  _rct5LogIoResult(result) {
    if (!result) {
      this.fail('I/O result missing');
      return;
    }

    if (result.ok) {
      this.pass(`${result.label}: ok in ${result.elapsedMs}ms`);
      return;
    }

    if (result.timedOut) {
      this.fail(`${result.label}: TIMEOUT after ${result.timeoutMs}ms`);
      return;
    }

    this.fail(`${result.label}: error after ${result.elapsedMs}ms: ${result.error}`);
  }

  async _rct5WithTimeout(label, promiseFactory, timeoutMs = 5000) {
    const startedAt = performance.now();
    let timeoutId = null;

    const timeoutPromise = new Promise(resolve => {
      timeoutId = setTimeout(() => {
        resolve({
          ok: false,
          timedOut: true,
          label,
          timeoutMs,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }, timeoutMs);
    });

    const workPromise = Promise.resolve()
      .then(() => promiseFactory())
      .then(value => ({
        ok: true,
        value,
        label,
        elapsedMs: Math.round(performance.now() - startedAt),
      }))
      .catch(error => ({
        ok: false,
        error: error.message,
        label,
        elapsedMs: Math.round(performance.now() - startedAt),
      }));

    const result = await Promise.race([workPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);

    return result;
  }

  async _extfs1ReadFileHandleStep(fileHandle, label) {
    const getFile = await this._extfs1Step(
      `${label}: fileHandle.getFile`,
      () => fileHandle.getFile(),
      { timeoutMs: 10000 }
    );

    if (!getFile.ok) {
      return {
        ok: false,
        failedAt: `${label}: fileHandle.getFile`,
        getFile,
      };
    }

    const file = getFile.value;

    const textResult = await this._extfs1Step(
      `${label}: file.text`,
      () => file.text(),
      { timeoutMs: 10000 }
    );

    if (!textResult.ok) {
      return {
        ok: false,
        failedAt: `${label}: file.text`,
        textResult,
      };
    }

    return {
      ok: true,
      file,
      text: textResult.value,
      getFile,
      textResult,
    };
  }

  async _extfs1WriteFileHandleStep(fileHandle, text, label) {
    const createWritable = await this._extfs1Step(
      `${label}: createWritable`,
      () => fileHandle.createWritable(),
      { timeoutMs: 10000 }
    );

    if (!createWritable.ok) {
      return {
        ok: false,
        failedAt: `${label}: createWritable`,
        createWritable,
      };
    }

    const writable = createWritable.value;

    const write = await this._extfs1Step(
      `${label}: writable.write ${text.length} chars`,
      () => writable.write(text),
      { timeoutMs: 10000 }
    );

    if (!write.ok) {
      return {
        ok: false,
        failedAt: `${label}: writable.write`,
        write,
      };
    }

    const close = await this._extfs1Step(
      `${label}: writable.close`,
      () => writable.close(),
      { timeoutMs: 10000 }
    );

    if (!close.ok) {
      return {
        ok: false,
        failedAt: `${label}: writable.close`,
        close,
      };
    }

    return {
      ok: true,
      createWritable,
      write,
      close,
    };
  }

  async _extfs1Step(label, fn, options = {}) {
    const timeoutMs = options.timeoutMs ?? 10000;
    const heartbeatMs = options.heartbeatMs ?? 1000;
    const startedAt = performance.now();

    this.log(`▶️ EXTFS1 START: ${label}`);

    let heartbeatId = null;
    let timeoutId = null;
    let beat = 0;

    const heartbeat = new Promise(resolve => {
      heartbeatId = setInterval(() => {
        beat++;
        const elapsed = Math.round(performance.now() - startedAt);
        this.log(`⏳ EXTFS1 WAITING ${label}: ${elapsed}ms elapsed`);
      }, heartbeatMs);
    });

    const timeout = new Promise(resolve => {
      timeoutId = setTimeout(() => {
        const elapsed = Math.round(performance.now() - startedAt);
        resolve({
          ok: false,
          timedOut: true,
          label,
          elapsedMs: elapsed,
          timeoutMs,
        });
      }, timeoutMs);
    });

    const work = Promise.resolve()
      .then(fn)
      .then(value => ({
        ok: true,
        label,
        value,
        elapsedMs: Math.round(performance.now() - startedAt),
      }))
      .catch(error => ({
        ok: false,
        label,
        error: error.message,
        elapsedMs: Math.round(performance.now() - startedAt),
      }));

    const result = await Promise.race([work, timeout]);

    if (heartbeatId) clearInterval(heartbeatId);
    if (timeoutId) clearTimeout(timeoutId);

    if (result.ok) {
      this.log(`✅ EXTFS1 DONE: ${label} in ${result.elapsedMs}ms`);
    } else if (result.timedOut) {
      this.log(`❌ EXTFS1 TIMEOUT: ${label} after ${result.timeoutMs}ms`);
      this.log(`⚠️ EXTFS1 NOTE: the browser promise may still finish later, but tester is no longer waiting on it.`);
    } else {
      this.log(`❌ EXTFS1 ERROR: ${label} after ${result.elapsedMs}ms: ${result.error}`);
    }

    return result;
  }

}