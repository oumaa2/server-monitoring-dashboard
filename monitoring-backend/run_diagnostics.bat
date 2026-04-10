@echo off
echo Starting build and run... > run_log.txt
taskkill /F /IM java.exe >> run_log.txt 2>&1
mvn clean compile spring-boot:run >> run_log.txt 2>&1
echo Done. >> run_log.txt
