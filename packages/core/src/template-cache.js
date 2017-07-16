import angularProvider from './ng/angular';
import updates from './updates';
import manualReload from './manual-reload';

const
  filePathCommentPrefix =
  '<!-- File path (added by ng-hot-reload plugin): ',
  filePathCommentSuffix = ' -->';

function decorateTemplateCache(moduleName = 'ng') {
  const savedFilePaths = new Map();
  /**
   * Extracts the actual file path from the template and saves the
   * link betwen the relative url and the actual path in computer.
   * @param {string} path Relative path/url where the component attempts
   *      load the template from.
   * @param {string} file Template file.
   * @return {boolean} True if the function was able to extract the
   *      original path from the template.
   */
  function setFilePath(path, file) {
    const match = matchFilePath(file);
    if (!match) {
      return false;
    } else {
      savedFilePaths.set(match.filePath, path);
      return true;
    }
  }

  // Initialized when the app first runs
  let templateUpdates, $templateCache;
  const angular = angularProvider();

  // // Override the $templateCache service so we can react to template changes
  angular.module(moduleName).config(['$provide', function($provide) {
    $provide.decorator('$templateCache', ['$delegate', '$q',
    function($delegate, $q) {
      const originalPut = $delegate.put;
      function ngHotReloadPutTemplate(key, value) {
        let template;
        if (typeof value === 'object' && value !== null) {
          template = Array.isArray(value) ? value[1] : value.data;
        } else {
          template = value;
        }
        try {
          if (typeof template === 'string' && !savedFilePaths.has(key)) {
            setFilePath(key, template);
          }
          if (typeof template !== 'string') {
            console.warn('Don\'t know how to handle this value', value);
          }
        } catch (err) {
          // Woops, there's probably a developer error somewhere,
          // log here because otherwise angular will report this error
          // *very* vaguely and does not point to the library code at all.
          console.error(err);
        }
        return originalPut.call($delegate, key, value);
      };

      $delegate.put = (key, value) => {
        console.log('delegatePut', key, value);
        const type = typeof value;
        if (type === 'string') {
          return ngHotReloadPutTemplate(key, value);
        } else if (type === 'object' && typeof value.then === 'function') {
          return $q.when(value).then(value =>
            ngHotReloadPutTemplate(key, value));
        } else {
          console.warn('Don\'t know how to handle this value', value);
          return originalPut.call($delegate, key, value);
        }
      };

      $templateCache = $delegate;

      return $delegate;
    }]);
  }]);

  angular.module(moduleName).run(['$rootScope', function($rootScope) {
    templateUpdates = updates($rootScope, moduleName, 'template');
  }]);

  return {
    update(filePath, template) {
      if (template && $templateCache) {
        $templateCache.put(filePath, template);
        console.log('setting file to cache', template,
        templateUpdates, savedFilePaths.has(filePath), filePath,
        savedFilePaths);
      }
      if (templateUpdates && savedFilePaths.has(filePath)) {
        const key = savedFilePaths.get(filePath);
        templateUpdates.update(key);
      } else {
        manualReload('App was not initialized yet.');
      }
    },
    getTemplateCache: () => $templateCache,
  };
}

function matchFilePath(file) {
  const filePathStart = file.indexOf(filePathCommentPrefix);
  if (filePathStart === -1) {
    return null;
  }
  const filePathEnd = file.indexOf(filePathCommentSuffix, filePathStart) ||
    file.length;

  const filePath = file.substring(
    filePathStart + filePathCommentPrefix.length, filePathEnd);

  return {
    filePath,
    filePathStart,
    filePathEnd,
  };
}

export {
  filePathCommentPrefix,
  filePathCommentSuffix,
  decorateTemplateCache,
};
