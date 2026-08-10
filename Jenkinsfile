pipeline {
    agent any

    parameters {
        choice(
            name: 'MODULE',
            choices: [
                'all',
                'Login',
                'GlobalSearch',
                'FrontOfficeSetup',
                'ManagerFunction',
                'Marketing',
                'Reports',
                'SystemConfig',
                'frontdesk',
                'database'
            ],
            description: 'Select the test module to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit', 'msedge'],
            description: 'Select the browser'
        )
        choice(
            name: 'HEADLESS',
            choices: ['true', 'false'],
            description: 'Run in headless mode? (false = headed)'
        )
    }

    environment {
        PLAYWRIGHT_BROWSERS_PATH = 'C:\\playwright-browsers'
        CI = 'true'
        HEADED = "${params.HEADLESS == 'false' ? 'true' : 'false'}"
        KEEP_BROWSER_OPEN = 'false'
        MAXIMIZE_BROWSER = 'false'
    }

    stages {

        stage('Install Dependencies') {
            steps {
                script {
                    def module = params.MODULE
                    def browser = params.BROWSER
                    def isHeaded = params.HEADLESS == 'false'

                    echo "Module : ${module}"
                    echo "Browser: ${browser}"
                    echo "Headed : ${isHeaded}"

                    // Step 1: Install npm dependencies
                    echo 'Installing npm dependencies...'
                    bat 'npm install'

                    // Step 2: Install Playwright browser (with caching)
                    def folderMap = [
                        chromium : 'chromium-',
                        firefox  : 'firefox-',
                        webkit   : 'webkit-',
                        msedge   : 'msedge-'
                    ]
                    def prefix = folderMap[browser]

                    bat """
                        IF NOT EXIST "C:\\playwright-browsers" (
                            mkdir "C:\\playwright-browsers"
                        )
                        FOR /D %%d IN ("C:\\playwright-browsers\\${prefix}*") DO (
                            echo Browser already cached at %%d, skipping install.
                            EXIT /B 0
                        )
                        echo Installing ${browser}...
                        npx playwright install ${browser}
                    """
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    def module = params.MODULE
                    def browser = params.BROWSER
                    def isHeaded = params.HEADLESS == 'false'

                    def testPath = (module == 'all') ? '' : "tests/${module}/"
                    def headedFlag = isHeaded ? '--headed' : ''

                    if (headedFlag) {
                        bat "npx playwright test ${testPath} --project=${browser} ${headedFlag}"
                    } else {
                        bat "npx playwright test ${testPath} --project=${browser}"
                    }
                }
            }
        }
    }

    post {
        always {
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
        success {
            echo "Tests PASSED - Module: ${params.MODULE}, Browser: ${params.BROWSER}"
        }
        failure {
            echo "Tests FAILED - Module: ${params.MODULE}, Browser: ${params.BROWSER}"
        }
    }
}
