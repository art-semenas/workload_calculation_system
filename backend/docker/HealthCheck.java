import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Container health probe.
 *
 * <p>The runtime image is distroless: no shell, no wget, no curl. The JVM is the only thing
 * available to make an HTTP call, so the Docker HEALTHCHECK runs this class instead.
 *
 * <p>Lives outside src/ on purpose — it is compiled by the Dockerfile with javac, not by Maven, so
 * it stays out of the application jar and out of Jacoco/SpotBugs scope.
 */
public final class HealthCheck {

  private static final String HEALTH_URL = "http://localhost:8080/actuator/health";
  private static final Duration TIMEOUT = Duration.ofSeconds(3);

  private HealthCheck() {}

  public static void main(String[] args) {
    try {
      HttpResponse<Void> response =
          HttpClient.newBuilder()
              .connectTimeout(TIMEOUT)
              .build()
              .send(
                  HttpRequest.newBuilder(URI.create(HEALTH_URL)).timeout(TIMEOUT).GET().build(),
                  HttpResponse.BodyHandlers.discarding());
      // Actuator answers 503 when any component is DOWN, so the status code is enough.
      System.exit(response.statusCode() == 200 ? 0 : 1);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      System.exit(1);
    } catch (Exception e) {
      System.exit(1);
    }
  }
}
