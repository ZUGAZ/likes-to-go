import { Either, Schema } from "effect";
import { InvalidMessage } from "@/common/model/errors";
import type { RequestMessage } from "@/common/model/request-message";
import { RequestMessageSchema } from "@/common/model/request-message";

/**
 * Parse and validate an unknown message payload. Treat all incoming messages as untrusted.
 * Returns Right(requestMessage) on success, Left(InvalidMessage) on validation failure.
 */
export function parseRequestMessage(
	raw: unknown,
): Either.Either<RequestMessage, InvalidMessage> {
	return Either.mapLeft(
		Schema.decodeUnknownEither(RequestMessageSchema)(raw),
		(parseError) => new InvalidMessage({ reason: parseError.toString() }),
	);
}
