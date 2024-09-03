package sandipchitale.startspringio;

import com.intellij.ide.util.projectWizard.ModuleWizardStep;
import com.intellij.ide.util.projectWizard.WizardContext;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.intellij.ui.jcef.JBCefBrowser;
import com.intellij.ui.jcef.JBCefClient;
import com.intellij.util.ui.EmptyClipboardOwner;
import org.cef.browser.CefBrowser;
import org.cef.callback.CefBeforeDownloadCallback;
import org.cef.callback.CefDownloadItem;
import org.cef.callback.CefDownloadItemCallback;
import org.cef.handler.CefDownloadHandler;

import javax.swing.*;
import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.nio.file.Path;

public class StartSpringIOModuleWizardStep extends ModuleWizardStep {

    private final StartSpringModuleBuilder moduleBuilder;
    private final WizardContext context;
    private final Disposable parentDisposable;
    private String projectName;
    private Path projectFileDirectory;

    public StartSpringIOModuleWizardStep(StartSpringModuleBuilder moduleBuilder, WizardContext context, Disposable parentDisposable) {
        this.moduleBuilder = moduleBuilder;
        this.context = context;
        this.parentDisposable = parentDisposable;
    }

    @Override
    public JComponent getComponent() {
        SimpleToolWindowPanel contentToolWindow = new SimpleToolWindowPanel(true, true);
        JPanel progressBarWrapper = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        progressBarWrapper.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        JLabel progressBarLabel = new JLabel(" ");
        progressBarWrapper.add(progressBarLabel);

        JProgressBar progressBar = new JProgressBar();
        progressBar.setIndeterminate(false);
        progressBarWrapper.add(progressBar);

        JBCefBrowser browser = new JBCefBrowser("https://start.spring.io");
        JBCefClient client = browser.getJBCefClient();
        client.addDownloadHandler(new DownloadHandler(this, context, contentToolWindow, progressBar, progressBarLabel), browser.getCefBrowser());

        contentToolWindow.add(browser.getComponent(), BorderLayout.CENTER);
        contentToolWindow.add(progressBarWrapper, BorderLayout.SOUTH);

        return contentToolWindow;
    }

    private void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    private void setProjectFileDirectory(Path projectFileDirectory) {
        this.projectFileDirectory = projectFileDirectory;
    }

    @Override
    public void updateDataModel() {
        // Does not seem to help
        // context.setProjectName(projectName);
        // context.setProjectFileDirectory(projectFileDirectory, true);
    }

    private record DownloadHandler(StartSpringIOModuleWizardStep startSpringIOModuleWizardStep,
                                   WizardContext context,
                                   JComponent parent,
                                   JProgressBar progressBar,
                                   JLabel progressBarLabel) implements CefDownloadHandler {

        @Override
        public void onBeforeDownload(CefBrowser browser, CefDownloadItem downloadItem, String suggestedName, CefBeforeDownloadCallback callback) {
            parent.setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
            progressBar.setIndeterminate(true);
            progressBarLabel.setText("Generating, downloading project" + suggestedName + ".");
            callback.Continue(downloadItem.getFullPath(), false);
        }

        @Override
        public void onDownloadUpdated(CefBrowser browser, CefDownloadItem downloadItem, CefDownloadItemCallback callback) {
            if (downloadItem.isComplete()) {
                String downloadItemLocation = downloadItem.getFullPath();
                String suggestedFileName = downloadItem.getSuggestedFileName();
                String suggestedFileNameSansExtension = suggestedFileName.replaceFirst("\\.zip", "");
                context.putUserData(StartSpringModuleBuilder.START_SPRING_IO_DOWNLOADED_ZIP_LOCATION, downloadItemLocation);
                startSpringIOModuleWizardStep.setProjectName(suggestedFileNameSansExtension);
                String projectFileDirectory = context.getProjectFileDirectory();
                startSpringIOModuleWizardStep.setProjectFileDirectory(Path.of(projectFileDirectory, suggestedFileNameSansExtension));
                parent.getToolkit().getSystemClipboard().setContents(new StringSelection(suggestedFileNameSansExtension), EmptyClipboardOwner.INSTANCE);
                parent.setCursor(Cursor.getDefaultCursor());
                progressBar.setIndeterminate(false);
                progressBarLabel.setText("Downloaded project at: " + downloadItemLocation + " . Click Next and paste project name in clipboard " + suggestedFileNameSansExtension);
            }
        }
    }
}