package pl.alyx.api.excel.lifecycle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;
import pl.alyx.api.excel.util.DurationParser;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class LifecycleManager implements ApplicationListener<ApplicationReadyEvent> {
    private static final Logger logger = LoggerFactory.getLogger(LifecycleManager.class);
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private final Map<String, Object> config;

    public LifecycleManager(Map<String, Object> config) {
        this.config = config;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        Object lifecycle = config.get("lifecycle");
        if (lifecycle instanceof Map) {
            Object life = ((Map<?, ?>) lifecycle).get("life");
            if (life instanceof String) {
                String lifeStr = (String) life;
                try {
                    Duration duration = DurationParser.parse(lifeStr);
                    logger.info("Lifecycle limit set to {}, will shut down gracefully after this duration", lifeStr);
                    
                    scheduler.schedule(() -> {
                        logger.info("Lifecycle limit reached, initiating graceful shutdown");
                        System.exit(0);
                    }, duration.toMillis(), TimeUnit.MILLISECONDS);
                } catch (IllegalArgumentException e) {
                    logger.error("Invalid lifecycle duration format: {}", lifeStr, e);
                }
            }
        }
    }
}
