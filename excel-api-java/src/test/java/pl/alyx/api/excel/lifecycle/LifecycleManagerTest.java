package pl.alyx.api.excel.lifecycle;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import static org.mockito.Mockito.mock;

@SuppressWarnings("null")
class LifecycleManagerTest {

    private ApplicationContext applicationContext;
    private ApplicationReadyEvent event;

    @BeforeEach
    void setUp() {
        applicationContext = mock(ApplicationContext.class);
        event = mock(ApplicationReadyEvent.class);
        System.clearProperty("excel.api.life");
    }

    @AfterEach
    void tearDown() {
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
