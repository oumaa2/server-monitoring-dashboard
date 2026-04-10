import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class TemporaryIpUpdater {
        public static void main(String[] args) {
                String url = "jdbc:postgresql://192.168.56.104:5432/monitoring_db";
                String user = "monitoring_user";
                String password = "123456";

                try (Connection conn = DriverManager.getConnection(url, user, password);
                                Statement stmt = conn.createStatement()) {

                        int count1 = stmt.executeUpdate(
                                        "UPDATE servers SET ip_address = '192.168.56.101' WHERE hostname = 'master-node'");
                        int count2 = stmt.executeUpdate(
                                        "UPDATE servers SET ip_address = '192.168.56.103' WHERE hostname = 'target-02'");
                        int count3 = stmt.executeUpdate(
                                        "UPDATE servers SET ip_address = '192.168.56.104' WHERE hostname = 'target-03'");

                        System.out.println(
                                        "Updates completed. target-01: " + count1 + ", target-02: " + count2
                                                        + ", target-03: " + count3);

                } catch (Exception e) {
                        e.printStackTrace();
                }
        }
}
