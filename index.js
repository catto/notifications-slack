'use strict';

const Joi = require('joi');
const request = require('request');
const Notifier = require('screwdriver-notifications-base');
const EMOJI = {
    SUCCESS: ':heart_eyes:',
    FAILURE: ':sob:',
    ABORTED: ':zipper_mouth_face:',
    RUNNING: ':thinking_face:',
    QUEUED: ':sleeping:'
};
const SCHEMA_STATUS = Joi.string().valid(Object.keys(EMOJI));
const SCHEMA_SLACK_SETTINGS = Joi.object().keys({
    slack: Joi.object().keys({
        url: Joi.string().uri().required(),
        statuses: Joi.array().items(SCHEMA_STATUS).min(0)
    }).required()
});
const SCHEMA_BUILD_DATA = Joi.object()
    .keys({
        settings: SCHEMA_SLACK_SETTINGS.required(),
        status: SCHEMA_STATUS.required(),
        pipelineName: Joi.string(),
        jobName: Joi.string(),
        buildId: Joi.number().integer(),
        buildLink: Joi.string()
    });

class SlackNotifier extends Notifier {
    /**
    * Sets listener on server event of name 'eventName'
    * Currently, event is triggered with a build status is updated
    * @method notify
    * @return {Promise} resolves to false if status is not in notification statuses
    *                   resolves to emailer if status is in notification statuses
    */
    notify() {
        return new Promise((resolve, reject) => {
            this.server.on(this.eventName, (buildData) => {
                const validate = Joi.validate(buildData, SCHEMA_BUILD_DATA);

                if (validate.error) {
                    return reject('Invalid build data format');
                }

                const settings = buildData.settings;
                const status = buildData.status;
                const statusSettings = settings.slack.statuses || ['FAILURE'];

                if (!statusSettings.includes(status)) {
                    return resolve(null);
                }

                const params = {
                    body: {
                        username: 'screwdriver_bot',
                        text: `Screwdriver ${buildData.pipelineName} ${buildData.jobName} ` +
                              `#${buildData.buildId} ${status} ${EMOJI[status]}`
                    },
                    json: true,
                    method: 'POST',
                    url: settings.slack.url
                };

                return request(params, (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(body);
                });
            });
        });
    }
}

module.exports = SlackNotifier;
