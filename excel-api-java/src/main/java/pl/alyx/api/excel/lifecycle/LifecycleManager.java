package pl.alyx.api.excel.lifecycle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationListener;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import pl.alyx.api.excel.util.DurationParser;

import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class LifecycleManager implements ApplicationListener<ApplicationReadyEvent> {
    private static final Logger logger = LoggerFactory.getLogger(LifecycleManager.class);

    private final ApplicationContext applicationContext;

    public LifecycleManager(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        String life = System.getProperty("excel.api.life");
        if (life == null) {
            return;
        }
        try {
            Duration duration = DurationParser.parse(life);
            logger.info("Lifecycle limit set to {}, will shut down gracefully after this duration", life);

            ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "lifecycle-shutdown");
                t.setDaemon(true);
                return t;
            });
            scheduler.schedule(() -> {
                logger.info("Lifecycle limit reached, initiating graceful shutdown");
                int exitCode = org.springframework.boot.SpringApplication.exit(applicationContext, () -> 0);
                System.exit(exitCode);
            }, duration.toMillis(), TimeUnit.MILLISECONDS);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid lifecycle duration format: {}", life);
        }
    }
}
