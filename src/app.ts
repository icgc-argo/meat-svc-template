/*
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import express, { Request, RequestHandler, Response } from 'express';
import bodyParser from 'body-parser';
import * as swaggerUi from 'swagger-ui-express';
import path from 'path';
import yaml from 'yamljs';
import { AppConfig } from './config';
import Auth from './auth';
import log from './logger';

console.log('in App.ts');
const App = (config: AppConfig): express.Express => {
  // Auth middleware
  const noOpReqHandler: RequestHandler = (req, res, next) => {
    log.warn('calling protected endpoint without auth enabled');
    next();
  };
  const authFilter = config.auth.enabled
    ? Auth(config.auth.jwtKeyUrl, config.auth.jwtKey)
    : (scope: string) => {
        return noOpReqHandler;
      };

  const app = express();
  app.set('port', process.env.PORT || 3000);
  app.use(bodyParser.json());

  app.get('/', (req, res) => res.status(200).send('hello world'));
  app.get('/health', (req, res) => {
    const status = dbHealth.status == Status.OK ? 200 : 500;
    const resBody = {
      db: dbHealth,
      version: `${process.env.npm_package_version} - ${process.env.SVC_COMMIT_ID}`,
    };
    return res.status(status).send(resBody);
  });

  app.get('/protected', authFilter(config.auth.WRITE_SCOPE), (req, res) => {
    return res.send('I am protected');
  });

  app.use(
    config.openApiPath,
    swaggerUi.serve,
    swaggerUi.setup(yaml.load(path.join(__dirname, './resources/swagger.yaml'))),
  );
  return app;
};

export enum Status {
  OK = '😇',
  UNKNOWN = '🤔',
  ERROR = '😱',
}

export const dbHealth = {
  status: Status.UNKNOWN,
  stautsText: 'N/A',
};

export function setDBStatus(status: Status) {
  if (status == Status.OK) {
    dbHealth.status = Status.OK;
    dbHealth.stautsText = 'OK';
  }
  if (status == Status.UNKNOWN) {
    dbHealth.status = Status.UNKNOWN;
    dbHealth.stautsText = 'UNKNOWN';
  }
  if (status == Status.ERROR) {
    dbHealth.status = Status.ERROR;
    dbHealth.stautsText = 'ERROR';
  }
}

export default App;
