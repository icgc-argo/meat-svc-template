
debug: dcompose
	npm run debug

#run the docker compose file
dcompose:
	docker-compose -f compose/docker-compose.yaml up --force-recreate -d

# run all tests
verify:
	npm run test

stop:
	docker-compose  -f compose/docker-compose.yaml down --remove-orphans 

# delete. everything.
nuke:
	docker-compose  -f compose/docker-compose.yaml down --volumes --remove-orphans 
