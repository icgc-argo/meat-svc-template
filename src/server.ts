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

import App, { setDBStatus, Status } from './app';
import mongoose from 'mongoose';
import logger from './logger';
import { Server } from 'http';
import { getAppConfig } from './config';
import { database, up } from 'migrate-mongo';

let server: Server;
console.log('in server.ts');
(async () => {
  const appConfig = await getAppConfig();

  /**
   * This check is to avoid setting falsy value for user/pass if there is no user pass provided because process.env will force string "undefined"
   * which will fail the auth (used by migrate mongo config file).
   */
  const mongoProps = appConfig.mongoProperties;
  if (mongoProps.dbUser && mongoProps.dbPassword) {
    process.env.DB_USERNAME = mongoProps.dbUser;
    process.env.DB_PASSWORD = mongoProps.dbPassword;
  }

  let connection: any;
  try {
    connection = await database.connect();
    const migrated = await up(connection.db);
    migrated.forEach((fileName: string) => console.log('Migrated:', fileName));
  } catch (err) {
    console.error('failed to do migration', err);
    process.exit(-10);
    return;
  }

  /** Mongoose setup */
  mongoose.connection.on('connecting', () => {
    logger.info('Connecting to MongoDB...');
    setDBStatus(Status.OK);
  });
  mongoose.connection.on('connected', () => {
    logger.info('...Connection Established to MongoDB');
    setDBStatus(Status.OK);
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('Connection Reestablished');
    setDBStatus(Status.OK);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('Connection Disconnected');
    setDBStatus(Status.ERROR);
  });
  mongoose.connection.on('close', () => {
    logger.warn('Connection Closed');
    setDBStatus(Status.ERROR);
  });
  mongoose.connection.on('error', error => {
    logger.error('MongoDB Connection Error:' + error);
    setDBStatus(Status.ERROR);
  });
  mongoose.connection.on('reconnectFailed', () => {
    logger.error('Ran out of reconnect attempts, abandoning...');
    setDBStatus(Status.ERROR);
  });

  try {
    await mongoose.connect(appConfig.mongoProperties.dbUrl, {
      autoReconnect: true,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 30000,
      keepAlive: true,
      reconnectTries: 10,
      reconnectInterval: 3000,
      useNewUrlParser: true,
      user: appConfig.mongoProperties.dbUser,
      pass: appConfig.mongoProperties.dbPassword,
    });
  } catch (err) {
    logger.error('MongoDB connection error. Please make sure MongoDB is running. ' + err);
    process.exit();
  }

  /**
   * Start Express server.
   */
  const app = App(appConfig);
  server = app.listen(app.get('port'), () => {
    logger.info(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`);
    logger.info('Press CTRL-C to stop');
  });
})();
