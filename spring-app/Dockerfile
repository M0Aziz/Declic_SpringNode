# Use an official OpenJDK runtime as a parent image
FROM openjdk:8-jre-alpine

# Définissez le répertoire de travail dans le conteneur
WORKDIR /app

# Copy the JAR file into the container from the 'jar' directory
COPY jar/*.jar spring-app.jar
#COPY target/Candidate-1.jar spring-app.jar


# Exposez le port sur lequel votre application fonctionne
EXPOSE 9090

# Commande pour démarrer votre application
CMD ["java", "-jar", "spring-app.jar"]
