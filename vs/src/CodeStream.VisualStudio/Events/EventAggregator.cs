﻿using CodeStream.VisualStudio.Core.Logging;
using Serilog;
using System;
using System.Collections.Concurrent;
using System.Reactive.Linq;
using System.Reactive.Subjects;

namespace CodeStream.VisualStudio.Events
{
    public interface SEventAggregator { }

    public interface IEventAggregator
    {
        void Publish<TEvent>(TEvent sampleEvent) where TEvent : EventBase;
        IObservable<TEvent> GetEvent<TEvent>() where TEvent : EventBase;
    }

    public class EventAggregator : IEventAggregator, SEventAggregator
    {
        private static readonly ILogger Log = LogManager.ForContext<EventAggregator>();

        private readonly ConcurrentDictionary<Type, object> _subjects = new ConcurrentDictionary<Type, object>();

        public IObservable<TEvent> GetEvent<TEvent>() where TEvent : EventBase
        {
            var subject = (ISubject<TEvent>)_subjects.GetOrAdd(typeof(TEvent),
                            t => new Subject<TEvent>());

#if DEBUG
            Log.Verbose($"Subscribed: {typeof(TEvent)}");
#endif
            return subject.AsObservable();
        }

        public void Publish<TEvent>(TEvent sampleEvent) where TEvent : EventBase
        {
            if (_subjects.TryGetValue(typeof(TEvent), out var subject))
            {
#if DEBUG
                Log.Verbose($"Published: {typeof(TEvent)}");
#endif
                ((ISubject<TEvent>)subject).OnNext(sampleEvent);
            }
            else
            {
#if DEBUG
                Log.Verbose($"Not Found: {typeof(TEvent)}");
#endif
            }

        }
    }
}