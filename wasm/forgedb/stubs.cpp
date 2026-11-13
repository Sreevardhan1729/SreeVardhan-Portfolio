// Replacements for the parts of ForgeDB that need a filesystem or other client connections.
#include <string>

#include "aof.h"
#include "pubsub.h"
#include "utils.h"

extern std::string pendingAof;

// Collect the append-only log in memory so the page can show what ForgeDB would persist.
void writeToAof(std::string data) { pendingAof += data; }

namespace {
RespMessage pubSubUnavailable() {
    return errorMessage("Pub/Sub needs a second client connection, so it is off in the browser");
}
}  // namespace

RespMessage handleSubscribe(const RespMessage &, int) { return pubSubUnavailable(); }
RespMessage handleUnSubscribe(const RespMessage &, int) { return pubSubUnavailable(); }
RespMessage handlePublish(const RespMessage &, int) { return pubSubUnavailable(); }
RespMessage unsubscribeClient(int) { return pubSubUnavailable(); }
