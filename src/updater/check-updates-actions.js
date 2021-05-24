const fetch = require('node-fetch');

// fetch last commit name and date
const fetchLastVersion = (currentUnit, logger, onLastVersionFetched) => {
    const { GIT_NAME, GIT_REPO, GIT_PROVIDER, GIT_DOMAIN } = currentUnit;
    logger.verbose('fetchLastVersion for ' + GIT_REPO);

    logger.silly(`currentUnit: ${GIT_NAME} ${GIT_REPO} ${GIT_PROVIDER} ${GIT_DOMAIN}`);
    let gitSource;
    switch (GIT_PROVIDER) {
        case 'GIT_LAB': {
            gitSource = 'http://' + GIT_DOMAIN + '/api/v4/projects/' + GIT_NAME + '%2F' + GIT_REPO  + '/repository/commits';
            break;
        }
        case 'GIT_HUB': {
            gitSource = 'https://api.' + GIT_DOMAIN + '/repos/' + GIT_NAME + '/' + GIT_REPO + '/commits';
            break;
        }
        default : {}
    }
    logger.debug(`currentUnit url = : ${gitSource}`);

    fetch(gitSource)
        .then((res) => {
            logger.debug('fetch(gitSource) res.ok = ' + res.ok)
            if (!res.ok) {
                logger.warn(res.status)
            }
            return res.json()
        })
        .then((json) => {
            if (Array.isArray(json)) {
                const resultList = parseCommitsListJson([json[0]], logger);
                onLastVersionFetched(resultList[0]);
            } else {
                logger.warn('Received data from GIT source is not correct, its must be array. ' + json.message);
            }
        })
        .catch((err) => logger.warn(err));
};


/**
 *  fetch last versions of dashbord and manager from GIT,
 *  compare with current versions
 *
 *  @return - run callback function with parameter: {object}
    {
         isAvailableUpdate: boolean,
         dashboardVersion: { - last version data
             isAvailableUpdate: boolean,
             date: String,
             message: String
         },
         managerVersion: { - last version data
             isAvailableUpdate: boolean,
             date: String,
             message: String
         }
     }
 */
 // TODO: !!! make handle if server is not available
const compareVersions = (SETTINGS, logger, next) => {
    const {
        MAIN_DIR,
        BS_DASHBOARD = {},
        BS_DASHBOARD_MANAGER = {},
        CURRENT_MANAGER_VERSION,
        CURRENT_DASHBOARD_VERSION
    } = SETTINGS;
    logger.info('Check for update.')
    fetchLastVersion(BS_DASHBOARD, logger, (lastDashboardVersion) => {
        fetchLastVersion(BS_DASHBOARD_MANAGER, logger, (lastManagerVersion) => {

            /*logger.silly(lastDashboardVersion);
            logger.silly(lastManagerVersion);*/

            const isAvailableDashboardUpdate = !(
                /*lastDashboardVersion.date === CURRENT_DASHBOARD_VERSION.date
                && */lastDashboardVersion.message === CURRENT_DASHBOARD_VERSION.message
            );
            logger.verbose('Dashboard update is available = ' + isAvailableDashboardUpdate);

            const isAvailableManagerUpdate = !(
                /*lastManagerVersion.date === CURRENT_MANAGER_VERSION.date
                && */lastManagerVersion.message === CURRENT_MANAGER_VERSION.message
            );
            logger.verbose('Manager update is available = ' + isAvailableManagerUpdate);

            if (isAvailableDashboardUpdate || isAvailableManagerUpdate) {
                logger.info('New update is available.');
            }
            next(Object.assign(
                {
                    isAvailableUpdate: isAvailableDashboardUpdate || isAvailableManagerUpdate
                },
                {
                    dashboardVersion: Object.assign(lastDashboardVersion, {isAvailableUpdate: isAvailableDashboardUpdate}),
                    managerVersion: Object.assign(lastManagerVersion, {isAvailableUpdate: isAvailableManagerUpdate})
                }
            ))
        })
    })
};

const parseCommitsListJson = (commitsArray, logger) => {
    logger.debug('parseCommitsListJson')
    logger.silly(commitsArray);
    return commitsArray.map((el) => {
        // parse from GitHub
        if (el.sha !== undefined) {
            return {
                date: el.commit.committer.date,
                message: el.commit.message
            }
        // parse other (from GitLab)
        } else {
            return {
                date: el.committed_date,
                message: el.title
                //message: el.message - full message text (title and description)
            }
        }
    })
};

exports.compareVersions = compareVersions;
