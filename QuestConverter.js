const fs		= require("fs");
const readline	= require("readline");



var debugEnabled	= false;
var convFile		= "QuestieHashes.csv";
var questieFile		= "!Questie.lua";
var pfQuestFile		= "pfQuest.lua";



var index;
var hashTable =
{
	id				: [],
	questieId		: [],
	questieIdAlt	: [],
	finished		: [],
}
var questie =
{
	id			: [],
	finished	: [],
}
var pfQuest =
{
	id			: [],
	finished	: []
}



function readInHashes(finished)
{
	var rl = readline.createInterface(
	{
		input : fs.createReadStream(convFile)
	});
	
	rl.on('line', (line) =>
	{
		index = line.substring(0, line.indexOf(","));
	
		if (isNaN(index))
		{
			return;
		}
	
		line							= line.slice(line.indexOf(",") + 1);
		hashTable.id[index]				= index;
		hashTable.questieId[index]		= line.substring(0, line.indexOf(","));
		line							= line.slice(line.indexOf(",") + 1);
		hashTable.questieIdAlt[index]	= line.substring(0);
		hashTable.finished[index]		= null;

		if (debugEnabled)
		{
			var tab1 = "\t";
			if (hashTable.questieId[index] <= 9999999)
			{
				tab1 = tab1 + "\t";
			}

			console.log("Hashes: " + hashTable.id[index] + "\t" + hashTable.questieId[index] + tab1 + hashTable.questieIdAlt[index]);
		}
	});
	
	rl.on('close', () =>
	{
		if (finished)
		{
			finished();
		}
	});
}

function readInQuestieFile(finished)
{
	const STATE_FIND_QUESTS		= 0;
	const STATE_PARSE_QUESTS	= 1;
	const STATE_PARSE_FINISHED	= 2;

	var state	= STATE_FIND_QUESTS;
	var i		= 0;

	var rl = readline.createInterface(
	{
		input : fs.createReadStream(questieFile)
	});
	
	rl.on('line', (line) =>
	{
		line = line.trim().replace(/ /g,'');;

		switch (state)
		{
			case STATE_FIND_QUESTS:
			{
				if (line.startsWith("QuestieSeenQuests"))
				{
					state = STATE_PARSE_QUESTS;
				}
		
				break;
			}
			case STATE_PARSE_QUESTS:
			{
				if (line.includes("}"))
				{
					state = STATE_PARSE_FINISHED;

					rl.close();

					return;
				}

				questie.id[i]		= line.substring(line.indexOf("[") + 1, line.indexOf("]"));
				questie.finished[i]	= line.substring(line.indexOf("=") + 1, line.indexOf(","));

				if (debugEnabled)
				{
					console.log("Questie: " + questie.id[i] + "\t" + questie.finished[i]);
				}

				i++;

				break;
			}
			default:
			{
				break;
			}
		}
	});
	
	rl.on('close', () =>
	{
		if (finished)
		{
			finished();
		}
	});
}

function readInPfQuestFile(finished)
{
	const STATE_FIND_QUESTS		= 0;
	const STATE_PARSE_QUESTS	= 1;
	const STATE_PARSE_FINISHED	= 2;

	var state = STATE_FIND_QUESTS;
	var index;

	var rl = readline.createInterface(
	{
		input : fs.createReadStream(pfQuestFile)
	});
	
	rl.on('line', (line) =>
	{
		line = line.trim().replace(/ /g,'');;

		switch (state)
		{
			case STATE_FIND_QUESTS:
			{
				if (line.startsWith("pfQuest_history"))
				{
					state = STATE_PARSE_QUESTS;
				}
		
				break;
			}
			case STATE_PARSE_QUESTS:
			{
				if (line.includes("}"))
				{
					state = STATE_PARSE_FINISHED;

					rl.close();

					return;
				}

				index				= line.substring(line.indexOf("[") + 1, line.indexOf("]"));
				pfQuest.id[index]		= index;
				pfQuest.finished[index]	= line.substring(line.indexOf("=") + 1, line.indexOf(","));

				if (debugEnabled)
				{
					console.log("pfQuest: " + pfQuest.id[index] + "\t" + pfQuest.finished[index]);
				}

				break;
			}
			default:
			{
				break;
			}
		}
	});
	
	rl.on('close', () =>
	{
		if (finished)
		{
			finished();
		}
	});
}

function fillHashTable()
{
	// mark finished quests of Questie in hashtable
	for (i = 0; i < questie.id.length; i++)
	{
		var idFound = false;

		for (id = 0; id < hashTable.id.length; id++)
		{
			if (hashTable.questieId[id] == questie.id[i])
			{
				idFound = true;

				break;
			}
			if (hashTable.questieIdAlt[id] == questie.id[i])
			{
				idFound = true;

				break;
			}
		}

		if (!idFound)
		{
			console.log("questie hash not found in hashtable " + questie.id[i]);
		}
		else
		{
			hashTable.finished[id] = Boolean(Number(questie.finished[i])).toString();
		}
	}

	// mark finished quests of pfQuest in hashtable
	pfQuest.id.forEach((id) =>
	{
		if (hashTable.id[id] != id)
		{
			console.log("pfQuest id not found in hashtable " + id);
		}
		if (hashTable.finished[id] == "true")
		{
			console.log("pfQuest id already marked as finished " + id);
		}

		hashTable.finished[id] = pfQuest.finished[id];
	});
}

function writeQuests(finished)
{
	const STATE_FIND_QUESTS		= 0;
	const STATE_WRITE_QUESTS	= 1;
	const STATE_WRITE_SKIP		= 2;
	const STATE_WRITE_LAST		= 3;
	const STATE_WRITE_FINISHED	= 3;

	var state = STATE_FIND_QUESTS;
	var data = [];

	var rl = readline.createInterface(
	{
		input : fs.createReadStream(pfQuestFile)
	});
	
	rl.on('line', (line) =>
	{
		switch (state)
		{
			case STATE_FIND_QUESTS:
			{
				data.push(line);

				if (line.startsWith("pfQuest_history"))
				{
					state = STATE_WRITE_QUESTS;
				}
		
				break;
			}
			case STATE_WRITE_QUESTS:
			{
				for (j = 0; j < hashTable.id.length; j++)
				{
					if (hashTable.finished[j] == null)
					{
						continue;
					}

					data.push("\t[" + hashTable.id[j] + "] = " + hashTable.finished[j] + ",");
				}

				state = STATE_WRITE_SKIP;

				break;
			}
			case STATE_WRITE_SKIP:
			{
				if (line.includes("}"))
				{
					data.push(line);

					state = STATE_WRITE_LAST;
				}

				break;
			}
			case STATE_WRITE_LAST:
			{
				data.push(line);

				break;
			}
			default:
			{
				break;
			}
		}
	});
	
	rl.on('close', () =>
	{
		if (debugEnabled)
		{
			console.log("writing file:")
		}

		var writer = fs.createWriteStream(pfQuestFile);
		data.forEach((line) =>
		{
			line = line + "\n";

			if (debugEnabled)
			{
				console.log(line);
			}

			writer.write(line);
		});
		writer.end();

		if (finished)
		{
			finished();
		}
	});
}


readInHashes(() =>
{
	readInQuestieFile(() =>
	{
		readInPfQuestFile(() =>
		{
			fillHashTable();
			writeQuests();
		});
	});
})
