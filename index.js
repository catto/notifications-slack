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
        channel: Joi.string().required(),
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
    _notify(buildData) {
        const validate = Joi.validate(buildData, SCHEMA_BUILD_DATA);

        if (validate.error) {
            return console.log('Invalid build data format');
        }

        const settings = buildData.settings;
        const status = buildData.status;
        const statusSettings = settings.slack.statuses || ['FAILURE'];

        if (!statusSettings.includes(status)) {
            return console.log(null);
        }

        const params = {
            form: {
                username: 'screwdriver_bot',
                token: this.config.token,
                pretty: '1',
                channel: settings.slack.channel,
                text: `Screwdriver ${buildData.pipelineName} ${buildData.jobName} ` +
                      `#${buildData.buildId} ${status} ${EMOJI[status]}` +
                      `\nBuild link: "http://dummyUrl"`
                      //`\nBuild link: ${buildData.buildLink}`
            },
            json: false,
            method: 'POST',
            url: 'https://slack.com/api/chat.postMessage'
        };

        return request(params, (err, response, body) => {
            if (err) {
                return console.log(err);
            }

            return console.log(body);
        });
    }
}

module.exports = SlackNotifier;
