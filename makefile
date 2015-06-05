# Detect if we're running Windows
ifdef SystemRoot
	# If so, set the file & folder deletion commands:
	FixPath = $(subst /,\,$1)
else
	# Otherwise, assume we're running *N*X:
	FixPath = $1
endif

NODE_MODULES := ./node_modules/.bin/

test:
	@NODE_ENV=test$(call FixPath, $(NODE_MODULES))mocha -R spec -b --recursive

.PHONY: test
