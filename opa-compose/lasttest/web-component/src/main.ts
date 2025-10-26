import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { OpaLoadtestComponent } from './app/opa-loadtest.component';

(async () => {
  const app = await createApplication({
    providers: [provideHttpClient()],
  });

  const opaLoadtest = createCustomElement(OpaLoadtestComponent, {
    injector: app.injector,
  });

  customElements.define('opa-loadtest-ui', opaLoadtest);
})();
