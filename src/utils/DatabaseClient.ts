import { config as dotenvConfig } from 'dotenv';
import logger from '../core/Logger';

type SupportedDatabase = 'postgres' | 'mysql' | 'mssql';

export type QueryParams = unknown[] | Record<string, unknown>;

interface DatabaseConfig {
  type: SupportedDatabase;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

export class DatabaseClient {
  private config?: DatabaseConfig;
  private pgPool: any;
  private mysqlPool: any;
  private mssqlPool: any;

  constructor() {
    // Ensure env is available even when this class is used outside Playwright config bootstrap.
    dotenvConfig();
    this.config = this.loadConfigFromEnv();
  }

  isConfigured(): boolean {
    return Boolean(this.config);
  }

  getDatabaseType(): SupportedDatabase | undefined {
    return this.config?.type;
  }

  private loadConfigFromEnv(): DatabaseConfig | undefined {
    const rawType = (process.env.DB_TYPE || '').trim().toLowerCase();

    if (!rawType) {
      logger.warn('DB_TYPE is not configured. Database validation layer is disabled.');
      return undefined;
    }

    if (!['postgres', 'mysql', 'mssql'].includes(rawType)) {
      throw new Error(`Unsupported DB_TYPE: ${rawType}. Use postgres, mysql, or mssql.`);
    }

    const host = process.env.DB_HOST || '';
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || '';
    const portFromEnv = process.env.DB_PORT || '';
    const ssl = (process.env.DB_SSL || 'false').toLowerCase() === 'true';

    if (!host || !user || !database) {
      logger.warn('Database config is incomplete. Required: DB_HOST, DB_USER, DB_NAME.');
      return undefined;
    }

    const defaultPort = rawType === 'postgres' ? 5432 : rawType === 'mysql' ? 3306 : 1433;
    const port = Number(portFromEnv || defaultPort);

    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid DB_PORT: ${portFromEnv}`);
    }

    return {
      type: rawType as SupportedDatabase,
      host,
      port,
      user,
      password,
      database,
      ssl,
    };
  }

  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Database is not configured. Set DB_* values in environment files.');
    }

    if (this.config.type === 'postgres' && !this.pgPool) {
      const { Pool } = await import('pg');
      this.pgPool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      });
      await this.pgPool.query('SELECT 1');
      logger.info('Connected to PostgreSQL database.');
    }

    if (this.config.type === 'mysql' && !this.mysqlPool) {
      const mysql = await import('mysql2/promise');
      this.mysqlPool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl ? {} : undefined,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });
      await this.mysqlPool.query('SELECT 1');
      logger.info('Connected to MySQL database.');
    }

    if (this.config.type === 'mssql' && !this.mssqlPool) {
      const mssqlModule = await import('mssql');
      const mssql = (mssqlModule as any).default ?? mssqlModule;
      this.mssqlPool = await mssql.connect({
        server: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        options: {
          encrypt: this.config.ssl,
          trustServerCertificate: true,
        },
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      });
      await this.mssqlPool.request().query('SELECT 1 AS ok');
      logger.info('Connected to SQL Server database.');
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params: QueryParams = []): Promise<T[]> {
    if (!this.config) {
      throw new Error('Database is not configured. Set DB_* values in environment files.');
    }

    await this.connect();

    if (this.config.type === 'postgres') {
      const result = await this.pgPool.query(sql, Array.isArray(params) ? params : []);
      return result.rows as T[];
    }

    if (this.config.type === 'mysql') {
      const [rows] = await this.mysqlPool.query(sql, Array.isArray(params) ? params : []);
      return rows as T[];
    }

    const request = this.mssqlPool.request();
    if (Array.isArray(params)) {
      params.forEach((value, index) => {
        request.input(`p${index + 1}`, value as any);
      });
    } else {
      Object.entries(params).forEach(([name, value]) => {
        request.input(name, value as any);
      });
    }

    const result = await request.query(sql);
    return result.recordset as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: QueryParams = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = undefined;
    }

    if (this.mysqlPool) {
      await this.mysqlPool.end();
      this.mysqlPool = undefined;
    }

    if (this.mssqlPool) {
      await this.mssqlPool.close();
      this.mssqlPool = undefined;
    }

    logger.info('Database connections closed.');
  }
}

export const databaseClient = new DatabaseClient();
