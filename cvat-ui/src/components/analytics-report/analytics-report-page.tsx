// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import notification from 'antd/lib/notification';
import { Row, Col } from 'antd/lib/grid';

import {
    Project, Task, Job, getCore, MembershipRole, AnalyticsEventsFilter,
} from 'cvat-core-wrapper';
import { useInstanceType, useInstanceId } from 'utils/hooks';
import { shallowEqual } from 'utils/redux';
import { CombinedState, InstanceType } from 'reducers';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import AnalyticsReportContent from './analytics-report-content';
import AnalyticsPageHeader from './analytics-page-header';
import { TimePeriod } from '.';

const core = getCore();

interface AnnotationCountsProps {
    taskId: number;
}

function AnnotationCounts({ taskId }: AnnotationCountsProps): JSX.Element {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCounts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/test/tasks/${taskId}/annotation-counts`,
                {
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to load annotation counts (${response.status})`,
                );
            }

            const data = await response.json();
            setCounts(data.counts || {});
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load annotation counts',
            );
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    const entries = Object.entries(counts).sort(
        (a, b) => b[1] - a[1],
    );

    const maxCount = entries.length
        ? Math.max(...entries.map(([, count]) => count))
        : 0;

    return (
        <div className='annotation-counts-wrapper'>
            <h3 className='annotation-counts-title'>
                Annotation Counts
            </h3>

            {loading && (
                <div className='annotation-counts-message'>
                    Loading annotation counts...
                </div>
            )}

            {!loading && error && (
                <div className='annotation-counts-message error'>
                    <p>{error}</p>
                    <button type='button' onClick={fetchCounts}>
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && entries.length === 0 && (
                <div className='annotation-counts-message'>
                    No annotations found
                </div>
            )}

            {!loading && !error && entries.length > 0 && (
                <div className='annotation-counts-chart'>
                    {entries.map(([label, count]) => (
                        <div
                            key={label}
                            className='annotation-counts-row'
                        >
                            <div
                                className='annotation-counts-label'
                                title={label}
                            >
                                {label}
                            </div>

                            <div className='annotation-counts-bar-container'>
                                <div
                                    className='annotation-counts-bar'
                                    style={{
                                        width: `${(count / maxCount) * 100}%`,
                                    }}
                                />
                            </div>

                            <div className='annotation-counts-value'>
                                {count}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AnalyticsReportPage(): JSX.Element {
    const requestedInstanceType: InstanceType = useInstanceType();
    const requestedInstanceId = useInstanceId(requestedInstanceType);
    const [timePeriod, setTimePeriod] = useState<TimePeriod | null>(null);
    const [exporting, setExporting] = useState(false);
    const [resource, setResource] = useState<Project | Task | Job | null>(null);
    const [fetching, setFetching] = useState(true);

    const { user, org } = useSelector((state: CombinedState) => ({
        user: state.auth.user,
        org: state.organizations.current,
    }), shallowEqual);

    const onExportEvents = useCallback(async () => {
        if (!resource || !user) {
            return;
        }

        try {
            setExporting(true);
            const params: AnalyticsEventsFilter = {};

            if (timePeriod) {
                params.from = timePeriod.startDate;
                params.to = timePeriod.endDate;
            }

            if (resource instanceof Project) {
                params.projectId = resource.id;
                params.filename = `export-csv-events-project-${resource.id}.csv`;
            } else if (resource instanceof Task) {
                params.taskId = resource.id;
                params.filename = `export-csv-events-task-${resource.id}.csv`;
            } else {
                params.jobId = resource.id;
                params.filename = `export-csv-events-job-${resource.id}.csv`;
            }

            if (org) {
                const memberships = await org.members(
                    {
                        filter: `{"and":[{"==":[{"var":"user"},"${user.username}"]}]}`,
                    },
                );

                const isMaintainer = !!memberships.length &&
                    [MembershipRole.MAINTAINER, MembershipRole.OWNER]
                        .includes(memberships[0].role);

                if (!(user.isSuperuser || isMaintainer)) {
                    params.userId = user.id;
                }
            } else if (!user.isSuperuser) {
                params.userId = user.id;
            }

            const url = await core.analytics.events.export(params);
            const a = document.createElement('a');

            try {
                a.setAttribute('href', url);
                a.setAttribute('download', params.filename);
                a.click();
            } finally {
                a.remove();
            }
        } catch (error: unknown) {
            notification.error({
                message: 'Could not export events for the target resource',
                description: error instanceof Error ? error.message : '',
            });
        } finally {
            setExporting(false);
        }
    }, [user, org, resource, timePeriod]);

    useEffect(() => {
        if (
            Number.isInteger(requestedInstanceId) &&
            [InstanceType.PROJECT, InstanceType.TASK, InstanceType.JOB]
                .includes(requestedInstanceType)
        ) {
            let resourcePromise = null as (
                ReturnType<typeof core.projects.get> |
                ReturnType<typeof core.tasks.get> |
                ReturnType<typeof core.jobs.get> |
                null
            );

            if (requestedInstanceType === InstanceType.PROJECT) {
                resourcePromise = core.projects.get({
                    id: requestedInstanceId,
                });
            } else if (requestedInstanceType === InstanceType.TASK) {
                resourcePromise = core.tasks.get({
                    id: requestedInstanceId,
                });
            } else {
                resourcePromise = core.jobs.get({
                    jobID: requestedInstanceId,
                });
            }

            setFetching(true);

            resourcePromise
                .then((_resource) => {
                    setResource(_resource[0]);
                })
                .catch((error: unknown) => {
                    notification.error({
                        message: 'Could not receive the target resource from the server',
                        description: error instanceof Error ? error.message : '',
                    });
                })
                .finally(() => {
                    setFetching(false);
                });
        }
    }, []);

    return (
        <div className='cvat-analytics-page'>
            <div className='cvat-analytics-wrapper'>
                <Row justify='center'>
                    <Col
                        span={22}
                        xl={18}
                        xxl={14}
                        className='cvat-task-top-bar'
                    >
                        <GoBackButton />
                    </Col>
                </Row>

                <Row
                    justify='center'
                    className='cvat-analytics-inner-wrapper'
                >
                    <Col
                        span={22}
                        xl={18}
                        xxl={14}
                        className='cvat-analytics-inner'
                    >
                        {resource && (
                            <AnalyticsPageHeader
                                exporting={exporting}
                                fetching={fetching}
                                resource={resource}
                                onExportEvents={onExportEvents}
                                onUpdateTimePeriod={(
                                    from: Date | null,
                                    to: Date | null,
                                ) => {
                                    function localToUTC(date: Date): string {
                                        return (
                                            new Date(
                                                Number(date) -
                                                date.getTimezoneOffset() * 60000,
                                            ).toISOString()
                                        );
                                    }

                                    setTimePeriod(
                                        from && to
                                            ? {
                                                startDate: localToUTC(from),
                                                endDate: localToUTC(to),
                                            }
                                            : null,
                                    );
                                }}
                            />
                        )}

                        {fetching && <CVATLoadingSpinner />}

                        {resource instanceof Task && (
                            <AnnotationCounts taskId={resource.id} />
                        )}

                        {resource && (
                            <AnalyticsReportContent
                                timePeriod={timePeriod}
                                resource={resource}
                            />
                        )}
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default React.memo(AnalyticsReportPage);