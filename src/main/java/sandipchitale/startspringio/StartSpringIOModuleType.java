package sandipchitale.startspringio;

import com.intellij.openapi.module.ModuleType;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

public class StartSpringIOModuleType extends ModuleType<StartSpringModuleBuilder> {

    private static final String ID = "DEMO_MODULE_TYPE";

    private static final StartSpringIOModuleType INSTANCE = new StartSpringIOModuleType();

    StartSpringIOModuleType() {
        super(ID);
    }

    public static StartSpringIOModuleType getInstance() {
        return INSTANCE;
    }

    @NotNull
    @Override
    public StartSpringModuleBuilder createModuleBuilder() {
        return new StartSpringModuleBuilder();
    }

    @NotNull
    @Override
    public String getName() {
        return "start.spring.io";
    }

    @NotNull
    @Override
    public String getDescription() {
        return "Use start.spring.io to create a new Spring Boot project";
    }

    @NotNull
    @Override
    public Icon getNodeIcon(@Deprecated boolean b) {
        return StartSpringIOIcons.StartSpringIO_ICON;
    }

}
