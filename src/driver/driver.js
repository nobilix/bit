import reqCwd from 'req-cwd';
import resolveFrom from 'resolve-from';
import DriverNotFound from './exceptions/driver-not-found';
import { DEFAULT_LANGUAGE } from '../constants';
import { removeFromRequireCache } from '../utils';
import logger from '../logger/logger';

export default class Driver {
  lang: string;
  driver: Object;

  constructor(lang: string = DEFAULT_LANGUAGE) {
    this.lang = lang;
  }

  driverName(): string {
    return this.lang.startsWith('bit-') ? this.lang : `bit-${this.lang}`;
  }

  driverPath(): string {
    // "reqCwd" uses "resolveFrom" to determine the lib path
    return resolveFrom('.', this.driverName());
  }

  getDriver(silent: boolean = true): ?Object {
    if (this.driver) return this.driver;
    const langDriver = this.driverName();
    try {
      this.driver = reqCwd(langDriver);
      removeFromRequireCache(langDriver);
      return this.driver;
    } catch (err) {
      logger.error('failed to get the driver', err);
      if (silent) return undefined;
      if (err.code !== 'MODULE_NOT_FOUND' && err.message !== 'missing path') throw err;
      throw new DriverNotFound(langDriver, this.lang);
    }
  }

  runHook(hookName: string, param: *, returnValue?: *): Promise<*> {
    const driver = this.getDriver();
    // $FlowFixMe
    if (!driver || !driver.lifecycleHooks || !driver.lifecycleHooks[hookName]) {
      if (!driver) logger.info('unable to find a driver, the hooks will be ignored');
      else logger.info(`the driver doesn't implement ${hookName} hook`);
      return Promise.resolve(returnValue); // it's ok for a driver to not implement a hook
    }

    return driver.lifecycleHooks[hookName](param).then(() => returnValue);
  }

  // TODO: Improve flow object return type
  getDependencyTree(cwd: string, filePath: string): Promise<Object> {
    const driver = this.getDriver(false);
    return driver.getDependencyTree(cwd, filePath);
  }

  static load(lang) {
    return new Driver(lang);
  }
}
