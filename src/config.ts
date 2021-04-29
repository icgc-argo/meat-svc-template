/*
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
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

import * as dotenv from 'dotenv';
import * as vault from './vault';

export interface AppConfig {
  // Express
  serverPort: string;
  openApiPath: string;
  kafkaProperties: KafkaConfigurations;
  mongoProperties: MongoProps;
  auth: {
    enabled: boolean;
    jwtKeyUrl: string;
    jwtKey: string;
    WRITE_SCOPE: string;
  };
}

export interface MongoProps {
  // Mongo
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbUrl: string; // allow overriding all the url
  writeConcern: string;
  writeAckTimeout: number;
}
export interface KafkaConfigurations {
  kafkaMessagingEnabled: boolean;
  kafkaClientId: string;
  kafkaBrokers: string[];
}

const buildBootstrapContext = async () => {
  dotenv.config();

  const vaultEnabled = process.env.VAULT_ENABLED || false;
  let secrets: any = {};
  /** Vault */
  if (vaultEnabled) {
    if (process.env.VAULT_ENABLED && process.env.VAULT_ENABLED == 'true') {
      if (!process.env.VAULT_SECRETS_PATH) {
        throw new Error('Path to secrets not specified but vault is enabled');
      }
      try {
        secrets = await vault.loadSecret(process.env.VAULT_SECRETS_PATH);
      } catch (err) {
        console.error(err);
        throw new Error('failed to load secrets from vault.');
      }
    }
  }
  return secrets;
};

const buildAppContext = async (secrets: any): Promise<AppConfig> => {
  console.log('building app context');
  const config: AppConfig = {
    serverPort: process.env.PORT || '3000',
    openApiPath: process.env.OPENAPI_PATH || '/api-docs',
    mongoProperties: {
      dbName: secrets.DB_NAME || process.env.DB_NAME,
      dbUser: secrets.DB_USERNAME || process.env.DB_USERNAME,
      dbPassword: secrets.DB_PASSWORD || process.env.DB_PASSWORD,
      dbUrl: secrets.DB_URL || process.env.DB_URL || `mongodb://localhost:27027/appdb`,
      writeConcern: process.env.DEFAULT_WRITE_CONCERN || 'majority',
      writeAckTimeout: Number(process.env.DEFAULT_WRITE_ACK_TIMEOUT) || 5000,
    },
    kafkaProperties: {
      kafkaBrokers: process.env.KAFKA_BROKERS?.split(',') || new Array<string>(),
      kafkaClientId: process.env.KAFKA_CLIENT_ID || '',
      kafkaMessagingEnabled: process.env.KAFKA_MESSAGING_ENABLED === 'true' ? true : false,
    },
    auth: {
      enabled: process.env.AUTH_ENABLED !== 'false',
      jwtKeyUrl: process.env.JWT_KEY_URL || '',
      jwtKey: process.env.JWT_KEY || '',
      WRITE_SCOPE: process.env.WRITE_SCOPE || 'SERVICE.WRITE',
    },
  };
  return config;
};

export const getAppConfig = async (): Promise<AppConfig> => {
  const secrets = await buildBootstrapContext();
  return buildAppContext(secrets);
};
