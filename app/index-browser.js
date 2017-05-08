import { α$$, init } from './stream/alpha.js';
import { auth$$, userInfo$$ } from './stream/auth.js';
import { appsVm$$ } from './stream/app.stream.js';
import { servicesVm$$ } from './stream/service.stream.js';
import { tasksVm$$ } from './stream/task.stream.js';
import { networksVm$$ } from './stream/network.stream.js';
import { containersVm$$ } from './stream/container.stream.js';
import { registriesVm$$ } from './stream/registry.stream.js';
import { repositoriesVm$$ } from './stream/repository.stream.js';

init('admin', 'admin');

global.α$$ = α$$;
global.appsVm$$ = appsVm$$;
global.userInfo$$ = userInfo$$;
global.auth$$ = auth$$;
global.servicesVm$$ = servicesVm$$;
global.tasksVm$$ = tasksVm$$;
global.networksVm$$ = networksVm$$;
global.containersVm$$ = containersVm$$;
global.registriesVm$$ = registriesVm$$;
global.repositoriesVm$$ = repositoriesVm$$;
