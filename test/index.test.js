'use strict';

const Hapi = require('hapi');
const assert = require('chai').assert;
const sinon = require('sinon');
const mockery = require('mockery');

sinon.assert.expose(assert, { prefix: '' });

describe('index', () => {
    let serverMock;
    let notifier;
    let requestMock;
    let SlackNotifier;
    let buildData;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        requestMock = sinon.stub();
        requestMock.yieldsAsync(null, {}, null);
        mockery.registerMock('request', requestMock);

        // eslint-disable-next-line global-require
        SlackNotifier = require('../index');
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    describe('notify', () => {
        beforeEach(() => {
            serverMock = new Hapi.Server();
            serverMock.event('build_status_test');

            notifier = new SlackNotifier(null, serverMock, 'build_status_test');
            buildData = {
                settings: {
                    slack: {
                        url: 'https://slack.com/mychannel'
                    }
                },
                status: 'FAILURE',
                pipelineName: 'screwdrivercd/api',
                jobName: 'main',
                buildId: 12
            };
        });

        it('rejects if build data is invalid format', () => {
            const saveMe = notifier.notify()
                .then(() => assert.fail('should not get here'))
                .catch((err) => {
                    assert.notCalled(requestMock);
                    assert.equal(err, 'Invalid build data format');
                });

            delete buildData.status;
            serverMock.emit('build_status_test', buildData);

            return saveMe;
        });

        it('defaults status settings to FAILURE if not defined', () => {
            const saveMe = notifier.notify().then((res) => {
                assert.calledWithMatch(requestMock, {
                    body: {
                        text: ':sob: Screwdriver screwdrivercd/api main #12 FAILURE'
                    }
                });
                assert.equal(res, null);
            });

            serverMock.emit('build_status_test', buildData);

            return saveMe;
        });

        it('resolves to null if build status is not in the settings', () => {
            const saveMe = notifier.notify().then((res) => {
                assert.notCalled(requestMock);
                assert.equal(res, null);
            });

            buildData.settings.slack.statuses = ['SUCCESS', 'FAILURE'];
            buildData.status = 'ABORTED';
            serverMock.emit('build_status_test', buildData);

            return saveMe;
        });

        it('rejects if request fails', () => {
            requestMock.yieldsAsync('some error', {}, null);
            const saveMe = notifier.notify()
                .then(() => assert.fail('should not get here'))
                .catch(err => assert.equal(err, 'some error'));

            serverMock.emit('build_status_test', buildData);

            return saveMe;
        });
    });
});
