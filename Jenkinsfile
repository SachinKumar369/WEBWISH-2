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
        // 👇 UPDATE THIS PATH to your local project folder
        PROJECT_DIR = 'E:\\Automation Project\\WebWish 2'
        PLAYWRIGHT_BROWSERS_PATH = 'C:\\playwright-browsers'
        CI = 'true'
        HEADED = 'false'
        KEEP_BROWSER_OPEN = 'false'
        MAXIMIZE_BROWSER = 'false'
    }

    stages {

        stage('Run Tests') {
            steps {
                script {
                    // Work directly from local project folder
                    dir("${env.PROJECT_DIR}") {

                        // Step 1: Install Dependencies
                        echo '📦 Installing dependencies...'
                        bat 'npm ci'

                        // Step 2: Install Playwright Browser (with caching)
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

                        // Step 3: Run Tests
                        def module = params.MODULE
                        echo "🧪 Running Module  : ${module}"
                        echo "🌐 Running Browser : ${browser}"

                        if (module == 'all') {
                            bat "npx playwright test --project=${browser}"
                        } else {
                            bat "npx playwright test tests/${module}/ --project=${browser}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            dir("${env.PROJECT_DIR}") {
                // Publish Playwright HTML Report
                publishHTML([
                    allowMissing         : true,
                    alwaysLinkToLastBuild: true,
                    keepAll              : true,
                    reportDir            : 'reports/html-report',
                    reportFiles          : 'index.html',
                    reportName           : "Playwright Report - ${params.MODULE}"
                ])
                // Publish JUnit results for Jenkins test trend
                junit testResults: 'test-results/junit.xml', allowEmptyResults: true
            }
        }
        success {
            echo "✅ Tests PASSED for module: ${params.MODULE}"
        }
        failure {
            echo "❌ Tests FAILED for module: ${params.MODULE}"
        }
    }
}