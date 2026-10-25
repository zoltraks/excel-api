package pl.alyx.api.excel.lifecycle;

import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.support.GenericApplicationContext;

@SuppressWarnings("null")
class LifecycleManagerTest {

    private GenericApplicationContext applicationContext;
    private ApplicationReadyEvent event;

    @BeforeEach
    void setUp() {
        applicationContext = new GenericApplicationContext();
        event = new ApplicationReadyEvent(
                new SpringApplication(LifecycleManagerTest.class),
                new String[0],
                applicationContext,
                Duration.ofSeconds(0));
        System.clearProperty("excel.api.life");
    }

    @AfterEach
    void tearDown() {
        applicationContext.close();
        System.clearProperty("excel.api.life");
    }

    @Test
    void shouldDoNothingWhenNoLifePropertySet() {
        LifecycleManager manager = new LifecycleManager(applicationContext);
        manager.onApplicationEvent(event);
    }

    @Test
    void shouldScheduleShutdownWhenLifePropertySet() throws InterruptedException {
        System.setProperty("excel.api.life", "1h");
        LifecycleManager manager = new LifecycleManager(applicationContext);
        manager.onApplicationEvent(event);
    }

    @Test
    void shouldHandleInvalidLifeFormat() {
        System.setProperty("excel.api.life", "invalid");
        LifecycleManager manager = new LifecycleManager(applicationContext);
        manager.onApplicationEvent(event);
    }
}
