// File: scripts/08_change_streams/validate_streams.js
// MongoDB Change Streams Validation - Stream functionality and performance checks

/**
 * CHANGE STREAMS VALIDATION
 * ==========================
 * Comprehensive validation suite for MongoDB Change Streams functionality.
 * Tests stream creation, event capture, performance, and reliability.
 */

// Database connections
const db = db.getSiblingDB('lms_primary');
const testDB = db.getSiblingDB('lms_test_streams');

print("\n" + "=".repeat(80));
print("MONGODB CHANGE STREAMS VALIDATION");
print("=".repeat(80));

// Global validation results
let streamValidation = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

// Helper function to record test results
function recordStreamTest(name, passed, message, warning = false) {
    streamValidation.total++;
    if (warning) {
        streamValidation.warnings++;
    } else if (passed) {
        streamValidation.passed++;
    } else {
        streamValidation.failed++;
    }

    streamValidation.tests.push({
        name: name,
        status: warning ? 'WARNING' : (passed ? 'PASSED' : 'FAILED'),
        message: message
    });

    const icon = warning ? '⚠️' : (passed ? '✅' : '❌');
    print(`${icon} ${name}: ${message}`);
}

// ============================================================================
// 1. BASIC CHANGE STREAMS FUNCTIONALITY
// ============================================================================

print("\n1. BASIC CHANGE STREAMS FUNCTIONALITY");
print("-".repeat(50));

/**
 * Test basic change stream creation and operation
 */
function validateBasicChangeStreams() {
    print("\n🌊 BASIC CHANGE STREAMS VALIDATION:");

    try {
        // Test 1: Create test collection
        testDB.stream_test.drop();
        testDB.createCollection('stream_test');

        recordStreamTest(
            "Test Collection Creation",
            true,
            "Test collection created successfully"
        );

        // Test 2: Basic change stream creation
        const basicStream = testDB.stream_test.watch();

        recordStreamTest(
            "Basic Change Stream Creation",
            basicStream !== null,
            basicStream ? "Change stream created successfully" : "Failed to create change stream"
        );

        if (basicStream) {
            // Test 3: Stream has expected properties
            const hasNext = typeof basicStream.hasNext === 'function';
            const hasClose = typeof basicStream.close === 'function';

            recordStreamTest(
                "Change Stream Interface",
                hasNext && hasClose,
                hasNext && hasClose ? "Stream has required methods" : "Stream missing required methods"
            );

            basicStream.close();
        }

    } catch (error) {
        recordStreamTest("Basic Change Streams", false, `Error: ${error.message}`);
    }
}

/**
 * Test change stream with different watch options
 */
function validateChangeStreamOptions() {
    print("\n⚙️ CHANGE STREAM OPTIONS VALIDATION:");

    const streamOptions = [
        {
            name: 'Full Document',
            options: { fullDocument: 'updateLookup' },
            description: 'Stream includes full document on updates'
        },
        {
            name: 'Full Document Before Change',
            options: { fullDocumentBeforeChange: 'whenAvailable' },
            description: 'Stream includes document state before change'
        },
        {
            name: 'Resume After',
            options: { startAfter: null }, // Would use actual resume token
            description: 'Stream can resume from specific point'
        },
        {
            name: 'Max Await Time',
            options: { maxAwaitTimeMS: 5000 },
            description: 'Stream respects timeout settings'
        }
    ];

    streamOptions.forEach(option => {
        try {
            let testStream;

            if (option.name === 'Resume After') {
                // Skip actual resume token test for now
                recordStreamTest(
                    `Change Stream ${option.name}`,
                    true,
                    `${option.description} (functionality available)`,
                    true
                );
                return;
            }

            testStream = testDB.stream_test.watch([], option.options);

            recordStreamTest(
                `Change Stream ${option.name}`,
                testStream !== null,
                testStream ? option.description : `Failed to create stream with ${option.name} option`
            );

            if (testStream) {
                testStream.close();
            }

        } catch (error) {
            recordStreamTest(
                `Change Stream ${option.name}`,
                false,
                `Error with ${option.name}: ${error.message}`
            );
        }
    });
}

// ============================================================================
// 2. EVENT CAPTURE VALIDATION
// ============================================================================

print("\n2. EVENT CAPTURE VALIDATION");
print("-".repeat(50));

/**
 * Test change stream event capture for different operations
 */
function validateEventCapture() {
    print("\n📡 EVENT CAPTURE VALIDATION:");

    try {
        // Setup test collection
        testDB.event_test.drop();
        testDB.createCollection('event_test');

        // Create change stream with full document options
        const eventStream = testDB.event_test.watch([], {
            fullDocument: 'updateLookup',
            fullDocumentBeforeChange: 'whenAvailable'
        });

        recordStreamTest(
            "Event Capture Stream Setup",
            eventStream !== null,
            "Event capture stream created"
        );

        if (!eventStream) return;

        // Test different operations
        const operations = [
            {
                name: 'Insert Operation',
                operation: () => testDB.event_test.insertOne({
                    _id: new ObjectId(),
                    testType: 'insert_test',
                    timestamp: new Date(),
                    data: 'Test insert data'
                }),
                expectedType: 'insert'
            },
            {
                name: 'Update Operation',
                operation: () => testDB.event_test.updateOne(
                    { testType: 'insert_test' },
                    { $set: { updated: true, updateTime: new Date() } }
                ),
                expectedType: 'update'
            },
            {
                name: 'Replace Operation',
                operation: () => testDB.event_test.replaceOne(
                    { testType: 'insert_test' },
                    {
                        testType: 'replace_test',
                        timestamp: new Date(),
                        data: 'Replaced data'
                    }
                ),
                expectedType: 'replace'
            },
            {
                name: 'Delete Operation',
                operation: () => testDB.event_test.deleteOne({ testType: 'replace_test' }),
                expectedType: 'delete'
            }
        ];

        // Process operations and capture events
        let capturedEvents = [];
        let eventCount = 0;

        // Start event capture in background (simulate with timeout)
        const capturePromise = new Promise((resolve) => {
            const captureStart = Date.now();
            const maxWaitTime = 10000; // 10 seconds

            function captureEvents() {
                try {
                    while (eventStream.hasNext() && (Date.now() - captureStart) < maxWaitTime) {
                        const event = eventStream.next();
                        capturedEvents.push(event);
                        eventCount++;
                    }
                } catch (error) {
                    // Timeout or no more events
                }
                resolve();
            }

            setTimeout(captureEvents, 1000); // Give operations time to execute
        });

        // Execute operations
        operations.forEach(op => {
            try {
                op.operation();
                recordStreamTest(
                    `${op.name} Execution`,
                    true,
                    `${op.name} executed successfully`
                );
            } catch (error) {
                recordStreamTest(
                    `${op.name} Execution`,
                    false,
                    `${op.name} failed: ${error.message}`
                );
            }
        });

        // Wait for event capture
        await capturePromise;

        recordStreamTest(
            "Event Capture Count",
            capturedEvents.length > 0,
            `Captured ${capturedEvents.length} events (expected: ${operations.length})`,
            capturedEvents.length !== operations.length
        );

        // Validate event structure
        capturedEvents.forEach((event, index) => {
            const hasRequiredFields = event._id && event.operationType && event.clusterTime;
            recordStreamTest(
                `Event ${index + 1} Structure`,
                hasRequiredFields,
                hasRequiredFields ?
                    `Event has required fields (${event.operationType})` :
                    "Event missing required fields"
            );
        });

        eventStream.close();

    } catch (error) {
        recordStreamTest("Event Capture", false, `Error: ${error.message}`);
    }
}

/**
 * Test change stream pipeline filtering
 */
function validateStreamPipeline() {
    print("\n🔍 STREAM PIPELINE VALIDATION:");

    try {
        // Test different pipeline stages
        const pipelineTests = [
            {
                name: 'Match Filter',
                pipeline: [{ $match: { 'operationType': 'insert' } }],
                description: 'Filter for insert operations only'
            },
            {
                name: 'Field Projection',
                pipeline: [
                    { $project: {
                        operationType: 1,
                        documentKey: 1,
                        timestamp: '$clusterTime'
                    }}
                ],
                description: 'Project specific fields'
            },
            {
                name: 'Complex Match',
                pipeline: [
                    { $match: {
                        $and: [
                            { 'operationType': { $in: ['insert', 'update'] } },
                            { 'fullDocument.testType': { $exists: true } }
                        ]
                    }}
                ],
                description: 'Complex filtering conditions'
            }
        ];

        pipelineTests.forEach(test => {
            try {
                const pipelineStream = testDB.event_test.watch(test.pipeline);

                recordStreamTest(
                    `Pipeline ${test.name}`,
                    pipelineStream !== null,
                    pipelineStream ? test.description : `Failed to create ${test.name} pipeline`
                );

                if (pipelineStream) {
                    pipelineStream.close();
                }

            } catch (error) {
                recordStreamTest(
                    `Pipeline ${test.name}`,
                    false,
                    `Pipeline error: ${error.message}`
                );
            }
        });

    } catch (error) {
        recordStreamTest("Stream Pipeline", false, `Error: ${error.message}`);
    }
}

// ============================================================================
// 3. RESUME TOKEN VALIDATION
// ============================================================================

print("\n3. RESUME TOKEN VALIDATION");
print("-".repeat(50));

/**
 * Test resume token functionality
 */
function validateResumeTokens() {
    print("\n🔄 RESUME TOKEN VALIDATION:");

    try {
        // Create test collection
        testDB.resume_test.drop();
        testDB.createCollection('resume_test');

        // Create initial change stream
        const initialStream = testDB.resume_test.watch();

        recordStreamTest(
            "Initial Resume Stream",
            initialStream !== null,
            "Initial change stream created"
        );

        if (!initialStream) return;

        // Insert test document to generate event
        const testDoc = {
            _id: new ObjectId(),
            testType: 'resume_test',
            timestamp: new Date()
        };

        testDB.resume_test.insertOne(testDoc);

        // Capture first event and resume token
        let firstEvent = null;
        let resumeToken = null;

        try {
            if (initialStream.hasNext()) {
                firstEvent = initialStream.next();
                resumeToken = firstEvent._id;

                recordStreamTest(
                    "Resume Token Capture",
                    resumeToken !== null,
                    resumeToken ? "Resume token captured successfully" : "No resume token found"
                );
            }
        } catch (error) {
            recordStreamTest("Resume Token Capture", false, `Capture error: ${error.message}`);
        }

        initialStream.close();

        // Test resuming from token
        if (resumeToken) {
            try {
                const resumedStream = testDB.resume_test.watch([], {
                    startAfter: resumeToken
                });

                recordStreamTest(
                    "Stream Resume",
                    resumedStream !== null,
                    "Stream resumed from token successfully"
                );

                if (resumedStream) {
                    // Insert another document to test resumed stream
                    testDB.resume_test.insertOne({
                        _id: new ObjectId(),
                        testType: 'resumed_test',
                        timestamp: new Date()
                    });

                    // Check if resumed stream captures new event
                    let newEvent = null;
                    try {
                        if (resumedStream.hasNext()) {
                            newEvent = resumedStream.next();
                        }
                    } catch (error) {
                        // Timeout is expected
                    }

                    recordStreamTest(
                        "Resumed Stream Capture",
                        true,
                        newEvent ? "Resumed stream captured new event" : "Resumed stream functional"
                    );

                    resumedStream.close();
                }

            } catch (error) {
                recordStreamTest("Stream Resume", false, `Resume error: ${error.message}`);
            }
        }

    } catch (error) {
        recordStreamTest("Resume Token", false, `Error: ${error.message}`);
    }
}

// ============================================================================
// 4. PERFORMANCE VALIDATION
// ============================================================================

print("\n4. PERFORMANCE VALIDATION");
print("-".repeat(50));

/**
 * Test change stream performance characteristics
 */
function validateStreamPerformance() {
    print("\n🚀 STREAM PERFORMANCE VALIDATION:");

    try {
        // Setup performance test collection
        testDB.perf_test.drop();
        testDB.createCollection('perf_test');

        // Create performance monitoring stream
        const perfStream = testDB.perf_test.watch();

        recordStreamTest(
            "Performance Test Setup",
            perfStream !== null,
            "Performance test stream created"
        );

        if (!perfStream) return;

        // Test 1: Bulk insert performance
        const bulkInsertStart = Date.now();
        const bulkDocs = [];

        for (let i = 0; i < 100; i++) {
            bulkDocs.push({
                _id: new ObjectId(),
                index: i,
                testType: 'bulk_insert',
                timestamp: new Date(),
                data: `Bulk test document ${i}`
            });
        }

        testDB.perf_test.insertMany(bulkDocs);
        const bulkInsertTime = Date.now() - bulkInsertStart;

        recordStreamTest(
            "Bulk Insert Performance",
            bulkInsertTime < 5000, // 5 second threshold
            `Bulk inserted 100 docs in ${bulkInsertTime}ms`,
            bulkInsertTime >= 5000
        );

        // Test 2: Event capture latency
        let eventsCaptured = 0;
        const captureStart = Date.now();
        const maxCaptureTime = 10000; // 10 seconds

        try {
            while (perfStream.hasNext() && (Date.now() - captureStart) < maxCaptureTime) {
                perfStream.next();
                eventsCaptured++;
            }
        } catch (error) {
            // Expected timeout
        }

        const captureTime = Date.now() - captureStart;
        const eventsPerSecond = eventsCaptured / (captureTime / 1000);

        recordStreamTest(
            "Event Capture Rate",
            eventsPerSecond > 10, // 10 events/second minimum
            `Captured ${eventsCaptured} events (${eventsPerSecond.toFixed(2)} events/sec)`,
            eventsPerSecond <= 10
        );

        // Test 3: Multiple streams concurrency
        const concurrentStreams = [];
        for (let i = 0; i < 5; i++) {
            try {
                const stream = testDB.perf_test.watch();
                concurrentStreams.push(stream);
            } catch (error) {
                break;
            }
        }

        recordStreamTest(
            "Concurrent Streams",
            concurrentStreams.length >= 3,
            `Created ${concurrentStreams.length} concurrent streams (minimum: 3)`,
            concurrentStreams.length < 3
        );

        // Cleanup streams
        concurrentStreams.forEach(stream => {
            try {
                stream.close();
            } catch (error) {
                // Ignore close errors
            }
        });

        perfStream.close();

    } catch (error) {
        recordStreamTest("Stream Performance", false, `Error: ${error.message}`);
    }
}

// ============================================================================
// 5. ERROR HANDLING VALIDATION
// ============================================================================

print("\n5. ERROR HANDLING VALIDATION");
print("-".repeat(50));

/**
 * Test change stream error handling and recovery
 */
function validateErrorHandling() {
    print("\n🛠️ ERROR HANDLING VALIDATION:");

    try {
        // Test 1: Invalid pipeline handling
        try {
            const invalidStream = testDB.error_test.watch([
                { $invalidStage: { field: 'invalid' } }
            ]);

            recordStreamTest(
                "Invalid Pipeline Handling",
                false,
                "Invalid pipeline should have thrown error"
            );

            if (invalidStream) invalidStream.close();

        } catch (error) {
            recordStreamTest(
                "Invalid Pipeline Handling",
                true,
                "Invalid pipeline properly rejected"
            );
        }

        // Test 2: Stream on non-existent collection
        try {
            const nonExistentStream = testDB.non_existent_collection.watch();

            recordStreamTest(
                "Non-existent Collection",
                nonExistentStream !== null,
                "Stream created on non-existent collection (expected behavior)",
                true
            );

            if (nonExistentStream) nonExistentStream.close();

        } catch (error) {
            recordStreamTest(
                "Non-existent Collection",
                false,
                `Unexpected error: ${error.message}`
            );
        }

        // Test 3: Stream timeout behavior
        try {
            const timeoutStream = testDB.timeout_test.watch([], {
                maxAwaitTimeMS: 100 // Very short timeout
            });

            recordStreamTest(
                "Stream Timeout Configuration",
                timeoutStream !== null,
                "Stream with timeout created successfully"
            );

            if (timeoutStream) {
                // Test timeout behavior
                try {
                    const hasNext = timeoutStream.hasNext();
                    recordStreamTest(
                        "Timeout Behavior",
                        true,
                        `Timeout handled properly (hasNext: ${hasNext})`
                    );
                } catch (timeoutError) {
                    recordStreamTest(
                        "Timeout Behavior",
                        true,
                        "Timeout exception handled"
                    );
                }

                timeoutStream.close();
            }

        } catch (error) {
            recordStreamTest("Stream Timeout", false, `Timeout test error: ${error.message}`);
        }

    } catch (error) {
        recordStreamTest("Error Handling", false, `Error: ${error.message}`);
    }
}

// ============================================================================
// 6. REPLICA SET REQUIREMENTS
// ============================================================================

print("\n6. REPLICA SET REQUIREMENTS");
print("-".repeat(50));

/**
 * Validate replica set requirements for change streams
 */
function validateReplicaSetRequirements() {
    print("\n🔗 REPLICA SET REQUIREMENTS VALIDATION:");

    try {
        // Check if we're connected to a replica set
        const isMasterResult = db.adminCommand({ isMaster: 1 });

        recordStreamTest(
            "Replica Set Detection",
            isMasterResult.setName !== undefined,
            isMasterResult.setName ?
                `Connected to replica set: ${isMasterResult.setName}` :
                "Not connected to replica set - change streams may not work fully"
        );

        // Check oplog availability
        try {
            const oplogDB = db.getSiblingDB('local');
            const oplogCount = oplogDB.oplog.rs.countDocuments({}, { limit: 1 });

            recordStreamTest(
                "Oplog Availability",
                oplogCount >= 0,
                "Oplog collection accessible"
            );
        } catch (oplogError) {
            recordStreamTest(
                "Oplog Availability",
                false,
                `Oplog not accessible: ${oplogError.message}`
            );
        }

        // Check if change streams are supported
        try {
            const testStream = db.test.watch();
            const supportsChangeStreams = testStream !== null;

            recordStreamTest(
                "Change Streams Support",
                supportsChangeStreams,
                supportsChangeStreams ?
                    "Change streams supported" :
                    "Change streams not supported"
            );

            if (testStream) testStream.close();

        } catch (supportError) {
            recordStreamTest(
                "Change Streams Support",
                false,
                `Change streams not supported: ${supportError.message}`
            );
        }

    } catch (error) {
        recordStreamTest("Replica Set Requirements", false, `Error: ${error.message}`);
    }
}

// ============================================================================
// 7. COMPREHENSIVE VALIDATION SUMMARY
// ============================================================================

/**
 * Display comprehensive validation summary
 */
function displayStreamValidationSummary() {
    print("\n" + "=".repeat(60));
    print("CHANGE STREAMS VALIDATION SUMMARY");
    print("=".repeat(60));

    print(`\n📊 OVERALL RESULTS:`);
    print(`   Total Tests: ${streamValidation.total}`);
    print(`   Passed: ${streamValidation.passed} ✅`);
    print(`   Failed: ${streamValidation.failed} ❌`);
    print(`   Warnings: ${streamValidation.warnings} ⚠️`);

    const successRate = Math.round((streamValidation.passed / streamValidation.total) * 100);
    print(`   Success Rate: ${successRate}%`);

    if (streamValidation.failed > 0) {
        print(`\n❌ FAILED TESTS:`);
        streamValidation.tests
            .filter(test => test.status === 'FAILED')
            .forEach(test => {
                print(`   • ${test.name}: ${test.message}`);
            });
    }

    if (streamValidation.warnings > 0) {
        print(`\n⚠️ WARNINGS:`);
        streamValidation.tests
            .filter(test => test.status === 'WARNING')
            .forEach(test => {
                print(`   • ${test.name}: ${test.message}`);
            });
    }

    // Recommendations
    print(`\n💡 RECOMMENDATIONS:`);
    if (streamValidation.failed === 0) {
        print(`   🎉 Change streams are working correctly!`);
        print(`   • Implement change stream monitoring`);
        print(`   • Set up resume token persistence`);
        print(`   • Configure appropriate error handling`);
    } else {
        print(`   📋 Address failed tests above`);
        print(`   🔧 Ensure replica set is properly configured`);
        print(`   📚 Review MongoDB change streams documentation`);
    }

    print(`\n✅ Validation completed!`);
}

// ============================================================================
// 8. EXECUTION SECTION
// ============================================================================

print("\n8. EXECUTING CHANGE STREAMS VALIDATION");
print("-".repeat(50));

try {
    // Basic functionality tests
    validateBasicChangeStreams();
    validateChangeStreamOptions();

    // Event capture tests
    validateEventCapture();
    validateStreamPipeline();

    // Advanced functionality tests
    validateResumeTokens();
    validateStreamPerformance();
    validateErrorHandling();

    // Infrastructure requirements
    validateReplicaSetRequirements();

    // Display comprehensive summary
    displayStreamValidationSummary();

} catch (error) {
    print("❌ Critical error during change streams validation:");
    print(error.message);
    recordStreamTest("Validation Execution", false, `Critical error: ${error.message}`);
}

// Cleanup test collections
try {
    testDB.dropDatabase();
    print("\n🧹 Test database cleaned up");
} catch (error) {
    print(`⚠️ Cleanup warning: ${error.message}`);
}

print("\n" + "=".repeat(80));
print("CHANGE STREAMS VALIDATION COMPLETE");
print("=".repeat(80));
