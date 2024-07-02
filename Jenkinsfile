pipeline {
    agent any

    stages {
        stage('GIT') {
            steps {
                echo "Getting Projects from Git"
                git branch: 'main', credentialsId: 'git-Token2', url: 'https://github.com/M0Aziz/Declic_Backend.git'
            }
        }

        stage('Build Spring Boot') {
            steps {
                dir('spring-app') {
                    sh 'mvn clean install -DskipTests'
                }
            }
        }

        stage('Install Dependencies for Node.js') {
            steps {
                dir('node-app') {
                    sh '/home/vagrant/.nvm/versions/node/v20.13.1/bin/npm install'
                }
            }
        }

        stage('Fix Jest Permissions') {
            steps {
                dir('node-app') {
                    sh 'chmod +x node_modules/.bin/jest'
                }
            }
        }

        stage('Jest Test') {
            steps {
                dir('node-app') {
                    sh "/home/vagrant/.nvm/versions/node/v20.13.1/bin/npm test"
                }
            }
        }

        stage('Send coverage to SonarCloud') {
            steps {
                dir('node-app') {
                    script {
                        def scannerHome = "/home/vagrant/jenkins/workspace/native-sonar-scanner/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner"
                        def projectKey = "declic"
                        def organization = "declic"
                        def sonarHostUrl = "https://sonarcloud.io"
                        def sonarLogin = "87ac6a83de71fef8a59833d5c7af27ac9ac33f40"
                        def lcovReportPath = "coverage/lcov.info"
                        
                        sh """
                        ${scannerHome} -X \
                        -Dsonar.projectKey=${projectKey} \
                        -Dsonar.organization=${organization} \
                        -Dsonar.javascript.lcov.reportPaths=${lcovReportPath} \
                        -Dsonar.host.url=${sonarHostUrl} \
                        -Dsonar.login=${sonarLogin} \
                        -Dsonar.c.file.suffixes=- \
                        -Dsonar.cpp.file.suffixes=- \
                        -Dsonar.objc.file.suffixes=-
                        """
                    }
                }
            }
        }

        stage('Build Docker images') {
            steps {
                sh 'docker-compose build'
            }
        }

        stage('Run Docker Compose') {
            steps {
                sh 'docker-compose up -d'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
