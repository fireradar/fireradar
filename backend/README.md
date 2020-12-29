## Running the tests

Run unit and integration tests with command

```
mvn test
```

## Deployment

Package the project as an executable jar with command

```
mvn package
```

Run executable jar with command

```
java -Xmx512m -Xss256k -jar target/aifmd-0.1.0.jar
```

## Built With

* [Spring Boot 2.x](https://spring.io/projects/spring-boot) - Spring platform and third-party libraries
* [Maven](https://maven.apache.org/) - Dependency Management
* [Liquibase](http://www.liquibase.org/) - Database migration tool
* [Apache POI](https://poi.apache.org/) - the Java API for Microsoft Documents

