pipeline {
    agent any

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

    environment {
        PLAYWRIGHT_BROWSERS_PATH = 'C:\\playwright-browsers'
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo 'Source code already checked out by Jenkins'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                script {
                    def browser = params.BROWSER
                    def folderMap = [
                        chromium : 'chromium-',
                        firefox  : 'firefox-',
                        webkit   : 'webkit-'
                    ]
                    def prefix = folderMap[browser]

                    bat """
                        IF NOT EXIST "C:\\playwright-browsers" (
                            mkdir "C:\\playwright-browsers"
                        )
                        FOR /D %%d IN ("C:\\playwright-browsers\\${prefix}*") DO (
                            echo ✅ Browser already cached at %%d, skipping install.
                            EXIT /B 0
                        )
                        echo ⬇️ No cached browser found. Installing ${browser}...
                        npx playwright install ${browser}
                    """
                }
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