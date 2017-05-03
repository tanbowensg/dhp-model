import hub from './stream/hub.js';
import { appsVm$$, getAppDetail } from './stream/app.stream.js';
import { servicesVm$$ } from './stream/service.stream.js';
import { tasksVm$$ } from './stream/task.stream.js';
import { networksVm$$ } from './stream/network.stream.js';
import { containersVm$$ } from './stream/container.stream.js';
import { registriesVm$$ } from './stream/registry.stream.js';

global.appsVm$$ = appsVm$$;
