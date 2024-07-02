# Use an official OpenJDK runtime as a parent image
FROM openjdk:8-jre-alpine

# Définissez le répertoire de travail dans le conteneur
WORKDIR /app

# Copiez le package.json et package-lock.json pour installer les dépendances
COPY target/Candidate-1.jar spring-app.jar


# Exposez le port sur lequel votre application fonctionne
EXPOSE 9090

# Commande pour démarrer votre application
CMD ["java", "-jar", "spring-app.jar"]
