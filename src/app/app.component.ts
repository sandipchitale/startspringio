import {ipcRenderer, OpenDialogReturnValue, shell} from "electron";
import * as path from 'path';
import {exec} from 'child_process';
import * as extract from 'extract-zip';
import * as fs from 'fs';
import * as os from 'os';
import {AfterViewInit, ChangeDetectorRef, Component, inject, NO_ERRORS_SCHEMA} from '@angular/core';
import {DOCUMENT} from "@angular/common";
import {FormsModule} from '@angular/forms';
import {ElectronService} from './core/services';
import {TranslateService} from '@ngx-translate/core';
import {APP_CONFIG} from '../environments/environment';

import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TabsModule} from 'primeng/tabs';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {ToolbarModule} from 'primeng/toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TabsModule, ToggleButtonModule, ToolbarModule],
  providers: [ElectronService, TranslateService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AppComponent implements AfterViewInit {
  private readonly document = inject(DOCUMENT);

  _darkTheme = false;
  restoreMaximize = false;

  downloadedZipPath: string | null = null;
  projectPath: string | null = null;

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }

    ipcRenderer.on('message-from-main', (_, message) => {
      try {
        switch (message.type) {
          case 'start-spring-io-project-started':
            this.downloadedZipPath = '';
            this.projectPath = '';
            break;
          case 'start-spring-io-project':
            this.downloadedZipPath = message.projectPath;
            break;
        }
      } finally {
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {
    // initial theme to match system theme
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.document.querySelector('html')?.classList.remove('dark-theme');
      this.darkTheme = false;
    } else {
      this.document.querySelector('html')?.classList.add('dark-theme');
      this.darkTheme = true;
    }
  }

  get darkTheme(): boolean {
    return this._darkTheme;
  }

  set darkTheme(value: boolean) {
    this._darkTheme = value;
    if (this._darkTheme) {
      this.document.querySelector('html')?.classList.add('dark-theme');
    } else {
      this.document.querySelector('html')?.classList.remove('dark-theme');
    }
    setTimeout(() => {
      const webView = this.document.getElementById('start-spring-io') as any;
      if (this._darkTheme) {
        webView.executeJavaScript(`document.body.classList.add('dark'); document.body.classList.remove('light');`);
      } else {
        webView.executeJavaScript(`document.body.classList.remove('dark'); document.body.classList.add('light');`);
      }
    }, 500);
  }

  extractZip() {
    if (this.downloadedZipPath) {
      const basename = path.basename(this.downloadedZipPath);
      const ext = path.extname(this.downloadedZipPath);
      const projectName = basename.substring(0, basename.length - ext.length);
      ipcRenderer.send('select-project-parent-dir', {
        title: 'Open parent directory for Project',
        defaultPath: `${path.join(os.homedir(), 'IdeaProjects')}`,
        properties: ['openDirectory'],
      });
      ipcRenderer.on('project-parent-dir', (_, openDialogReturnValue: OpenDialogReturnValue) => {
        (async () => {
          if (!openDialogReturnValue.canceled) {
            const projectParentDir = openDialogReturnValue.filePaths[0];
            await extract(this.downloadedZipPath!, {dir: projectParentDir});
            this.projectPath = path.join(projectParentDir, projectName);
            this.changeDetectorRef.detectChanges();
          }
        })();
      });
    }
  }

  openZipLocation() {
    if (this.downloadedZipPath) {
      shell.showItemInFolder(this.downloadedZipPath);
    }
  }

  openProjectLocation() {
    if (this.projectPath) {
      shell.showItemInFolder(this.projectPath);
    }
  }

  openProjectInIntelliJ() {
    if (this.projectPath) {
      let intellijPath = 'idea';
      if (os.platform() === 'linux') {
        const tryIntellijPath = `${os.homedir()}/.local/share/JetBrains/Toolbox/scripts/idea`;
        if (fs.existsSync(tryIntellijPath)) {
          intellijPath = tryIntellijPath;
        }
      } else if (os.platform() === 'win32') {
        // Prefer IntelliJ IDEA Ultimate
        let tryIntellijPath = `${os.homedir()}\\AppData\\Local\\Programs\\IntelliJ IDEA Ultimate\\bin\\idea.bat`;
        if (fs.existsSync(tryIntellijPath)) {
          intellijPath = tryIntellijPath;
        } else {
          // Try IntelliJ IDEA Community
          tryIntellijPath = `${os.homedir()}\\AppData\\Local\\JetBrains\\Toolbox\\scripts\\idea.cmd`;
          if (fs.existsSync(tryIntellijPath)) {
            intellijPath = tryIntellijPath;
          }
        }
      } else if (os.platform() === 'darwin') {
        const tryIntellijPath = `${os.homedir()}/Library/Application Support/JetBrains/Toolbox/scripts/idea`;
        if (fs.existsSync(tryIntellijPath)) {
          intellijPath = tryIntellijPath;
        }
      }
      this.openProject(intellijPath);
    }
  }

  openProjectInVSCode() {
    if (this.projectPath) {
      let vscodePath = 'code';
      if (os.platform() === 'linux') {
        const tryVscodePath = '/usr/bin/code';
        if (fs.existsSync(tryVscodePath)) {
          vscodePath = tryVscodePath;
        }
      } else if (os.platform() === 'win32') {
        const tryVscodePath = `\\Program Files\\Microsoft VS Code\\bin\\code.cmd`;
        if (fs.existsSync(tryVscodePath)) {
          vscodePath = tryVscodePath;
        }
      } else if (os.platform() === 'darwin') {
        const tryVscodePath = '/usr/local/bin/code';
        if (fs.existsSync(tryVscodePath)) {
          vscodePath = tryVscodePath;
        }
      }
      this.openProject(vscodePath);
    }
  }

  openProject(tool: string) {
    if (this.projectPath) {
      exec(`"${tool}" "${this.projectPath}"`, (error) => {
        if (error) {
          console.error(error);
        }
      });
    }
  }

  async gitHub() {
    await shell.openExternal('https://github.com/sandipchitale/startspringio/');
  }

  async startDotSpringDotIo() {
    await shell.openExternal('https://start.spring.io/');
  }

  toggleRestoreMaximize() {
    ipcRenderer.send('toggle-restore-maximize');
  }

  minimize() {
    ipcRenderer.send('minimize');
  }

  quit() {
    window.close();
  }
}
