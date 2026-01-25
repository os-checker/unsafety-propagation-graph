import type { RouteLocationNormalizedLoadedGeneric, Router } from "vue-router";

/** Returns the item URL in absolute address with current other queries. */
export default (
  item: string,
  route: RouteLocationNormalizedLoadedGeneric,
  router: Router
) => router.resolve({
  name: route.name,
  query: { ...route.query, item }
}).href
