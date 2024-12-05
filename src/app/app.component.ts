import {ipcRenderer} from "electron";
import * as path from 'path';
import * as extract from 'extract-zip';
import {exec} from 'child_process';
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
import {ExecException} from "node:child_process";

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

  downloadedProjectPath: string | null = null;

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

    ipcRenderer.on('message-from-main', (evt, message) => {
      try {
        switch (message.type) {
          case 'start-spring-io-project-started':
            this.downloadedProjectPath = '';
            break;
          case 'start-spring-io-project':
            this.downloadedProjectPath = message.projectPath;
            break;
        }
      } finally {
        this.changeDetectorRef.detectChanges();
      }
    });
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
  }

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.document.querySelector('html')?.classList.remove('dark-theme');
      this.darkTheme = false;
    } else {
      this.document.querySelector('html')?.classList.add('dark-theme');
      this.darkTheme = true;
    }
  }

  async openProjectInIntelliJ() {
    await this.openProject('/home/sandipchitale/.local/share/JetBrains/Toolbox/scripts/idea');
  }

  async openProjectInVSCode() {
    await this.openProject('code');
  }

  async openProject(tool: string) {
    if (this.downloadedProjectPath) {
      const dir = path.dirname(this.downloadedProjectPath);
      const basename = path.basename(this.downloadedProjectPath);
      const ext = path.extname(this.downloadedProjectPath);
      const projectDir = path.join(dir, basename.substring(0, basename.length - ext.length));
      try {
        await extract(this.downloadedProjectPath, {dir: dir});
        // await shell.openPath(projectDir);
        exec(`"${tool}" "${projectDir}"`, (error) => {
          console.error(error);
        });
      } catch(e) {
        console.error(e)
      }
    }
  }

  async gitHub() {
    await this.electronService.shell.openExternal('https://github.com/sandipchitale/startspringio/');
  }

  async startDotSpringDotIo() {
    await this.electronService.shell.openExternal('https://start.spring.io/');
  }

  quit() {
    window.close();
  }
}
