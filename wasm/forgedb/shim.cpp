// Browser entry points for ForgeDB. Requests and replies are RESP bytes, so every command
// goes through ForgeDB's own parser, dispatcher and serializer, unchanged.
#include <algorithm>
#include <cctype>
#include <string>
#include <string_view>
#include <unordered_set>

#include "command_handler.h"
#include "datastore.h"
#include "resp_parser.h"
#include "resp_serializer.h"
#include "utils.h"

std::string pendingAof;

namespace {
constexpr std::size_t kMaxKeys = 1000;
const std::unordered_set<std::string> kKeyCreatingCommands = {"SET", "LPUSH", "RPUSH", "HSET", "SADD"};

std::string reply;
std::string drainedAof;

std::string upper(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), ::toupper);
    return value;
}

RespMessage execute(std::string_view request) {
    int pos = 0;
    std::optional<RespMessage> message = resp_parser(request, pos);
    if (!message.has_value() || message->type != RespType::Array || message->elements.empty()) {
        return errorMessage("ERR Protocol error");
    }
    const std::vector<RespMessage> &args = message->elements;
    if (store.size() >= kMaxKeys && args.size() > 1 && kKeyCreatingCommands.count(upper(args[0].data)) &&
        store.find(args[1].data) == store.end()) {
        return errorMessage("ERR demo limit reached: 1000 keys. Reload the page to start over.");
    }
    return handleCommand(*message);
}
}  // namespace

extern "C" {
const char *forgedb_exec(const char *buf, int len) {
    reply = resp_serializer(execute(std::string_view(buf, len)));
    return reply.c_str();
}

int forgedb_reply_len() { return static_cast<int>(reply.size()); }

void forgedb_sweep() { clearExpiredKeys(); }

const char *forgedb_aof_drain() {
    drainedAof.swap(pendingAof);
    pendingAof.clear();
    return drainedAof.c_str();
}

int forgedb_aof_len() { return static_cast<int>(drainedAof.size()); }
}
