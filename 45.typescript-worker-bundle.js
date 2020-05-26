this.webpackChunk([45],{58:function(e,n,t){"use strict";t.r(n),n.default='/*! *****************************************************************************\nCopyright (c) Microsoft Corporation. All rights reserved. \nLicensed under the Apache License, Version 2.0 (the "License"); you may not use\nthis file except in compliance with the License. You may obtain a copy of the\nLicense at http://www.apache.org/licenses/LICENSE-2.0  \n \nTHIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY\nKIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED\nWARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, \nMERCHANTABLITY OR NON-INFRINGEMENT. \n \nSee the Apache Version 2.0 License for specific language governing permissions\nand limitations under the License.\n***************************************************************************** */\n\n\n\n/// <reference no-default-lib="true"/>\n\n\n/// <reference lib="es2015.symbol" />\n/// <reference lib="es2015.iterable" />\n\ninterface SymbolConstructor {\n    /**\n     * A method that returns the default async iterator for an object. Called by the semantics of\n     * the for-await-of statement.\n     */\n    readonly asyncIterator: symbol;\n}\n\ninterface AsyncIterator<T> {\n    next(value?: any): Promise<IteratorResult<T>>;\n    return?(value?: any): Promise<IteratorResult<T>>;\n    throw?(e?: any): Promise<IteratorResult<T>>;\n}\n\ninterface AsyncIterable<T> {\n    [Symbol.asyncIterator](): AsyncIterator<T>;\n}\n\ninterface AsyncIterableIterator<T> extends AsyncIterator<T> {\n    [Symbol.asyncIterator](): AsyncIterableIterator<T>;\n}'}});