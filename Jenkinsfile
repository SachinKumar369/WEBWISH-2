pipeline {
    agent any

    // tools {
    //     nodejs 'NodeJS_18'
    // }

    // ✅ User selects module and browser before every run
    parameters {
        choice(
            name: 'MODULE',
            choices: [
                'all',
                'frontdesk',
                'accounting',
                'housekeeping',
                'noshow',
                'reservations'
            ],
            description: 'Select the module to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit'],
            description: 'Select the browser'
        )
    }

    stages {

        stage('Checkout Code') {
            steps {
                git 'https://github.com/SachinKumar369/WEBWISH-2'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                bat 'npx playwright install'
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    def module  = params.MODULE
                    def browser = params.BROWSER

                    echo "Running Module  : ${module}"
                    echo "Running Browser : ${browser}"

                    if (module == 'all') {
                        bat "npx playwright test --project=${browser}"
                    } else {
                        bat "npx playwright test tests/${module}/ --project=${browser}"
                    }
                }
            }
        }
    }

    post {
        always {
            publishHTML([
                allowMissing         : true,
                alwaysLinkToLastBuild: true,
                keepAll              : true,
                reportDir            : 'playwright-report',
                reportFiles          : 'index.html',
                reportName           : "Playwright Report - ${params.MODULE}"
            ])
        }
        success {
            echo "✅ Tests PASSED for module: ${params.MODULE}"
        }
        failure {
            echo "❌ Tests FAILED for module: ${params.MODULE}"
        }
    }
}