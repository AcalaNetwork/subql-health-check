import Koa from 'koa';
import { request, gql } from 'graphql-request';
import { map } from './config';
import moment from 'moment';
import { v1 } from '@datadog/datadog-api-client';
import { EventPriority } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/EventPriority';
import { EventAlertType } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/EventAlertType';

const configuration = v1.createConfiguration();
const events = new v1.EventsApi(configuration);

const app = new Koa();

app.listen(3300, async () => {
  console.log('Server [data-warn-bot] start at: ', 3300);
  check();
  setInterval(() => {
    check();
  }, 1000 * 60 * 60 * 6)
});

const check = async () => {
  const list = Object.keys(map).map(key => {
    return {
      name: key,
      url: map[key]
    }
  })

  let strings = '';
  await Promise.all(list.map(async item => {
    const queryData = await request(item.url, gql`
      query {
        _metadata {
          indexerHealthy
          lastProcessedHeight
          targetHeight
        }
      }
    `)

    strings += `- name: ${item.name}, ${queryData._metadata.lastProcessedHeight}/${queryData._metadata.targetHeight} ${queryData._metadata.indexerHealthy ? 'healthy' : 'not healthy'} \n`

  }))

  await events.createEvent({
    body: {
      title: '[SUBQL_HEALTH_CHECK] Check if all subql nodes are healthy',
      text: `%%% \n ${strings} \n %%%`
    }
  });
  console.log('send success')
}